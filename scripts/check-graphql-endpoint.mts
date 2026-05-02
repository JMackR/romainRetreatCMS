/**
 * End-to-end check: every gql document in `src/lib/apollo/documents` is
 *   1. validated against the target endpoint's introspected schema, AND
 *   2. executed (a single sample run) so we catch resolver-level breakage too.
 *
 * Run:
 *   yarn check:graphql                              # both env defaults below
 *   yarn check:graphql --url http://localhost:4000/ # one explicit URL
 *   yarn check:graphql --url http://localhost:3002/graphql  # legacy monolith
 *
 * Exits non-zero on any validation error or unexpected query failure (network
 * 4xx / 5xx, missing fields, non-OK GraphQL errors) so it's CI-friendly.
 *
 * Use this after `yarn deploy:lambda all && yarn publish:aws-subgraphs` (server)
 * or any time you tweak `src/lib/apollo/documents/*` (CMS) to confirm both the
 * local Docker router and the AWS ALB router still understand the queries the
 * CMS Apollo Client actually ships.
 *
 * Implementation note: we read the document source files with a regex-based
 * extractor (instead of importing `@apollo/client`'s `gql`) because Apollo
 * Client v3's ESM build doesn't expose `gql` at the package root from Node.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildClientSchema, getIntrospectionQuery, parse, validate, type DocumentNode, type IntrospectionQuery } from 'graphql'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

type Endpoint = { label: string; url: string }

function parseArgs(argv: string[]): { endpoints: Endpoint[]; failOnAuthErrors: boolean } {
  const endpoints: Endpoint[] = []
  let failOnAuthErrors = false
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--url' && argv[i + 1]) {
      endpoints.push({ label: argv[i + 1]!, url: argv[i + 1]! })
      i += 1
    } else if (a === '--strict') {
      failOnAuthErrors = true
    }
  }
  if (endpoints.length === 0) {
    if (process.env.LOCAL_ROUTER_URL) endpoints.push({ label: 'local', url: process.env.LOCAL_ROUTER_URL })
    if (process.env.AWS_ROUTER_URL) endpoints.push({ label: 'aws', url: process.env.AWS_ROUTER_URL })
  }
  if (endpoints.length === 0) {
    // Sensible defaults — local docker-federation router and the deployed AWS ALB.
    endpoints.push({ label: 'local-docker', url: 'http://localhost:4000/' })
    endpoints.push({
      label: 'aws-alb',
      url: 'http://romain-retreat-router-alb-532333725.us-east-1.elb.amazonaws.com/',
    })
  }
  return { endpoints, failOnAuthErrors }
}

const SAMPLE_VARS: Record<string, Record<string, unknown>> = {
  // PostsList takes no vars; if you add more, give them a small sample row here.
}

// Match `export const X = gql\`…\`` template literals (single or multi-line,
// with embedded ${ident} fragment interpolation expanded by the loader below).
const FRAGMENT_EXPORT_RE = /export\s+const\s+(\w+)\s*=\s*gql\s*`([\s\S]*?)`/g

function loadDocuments(): { name: string; rawSource: string; doc: DocumentNode }[] {
  const dir = resolve(root, 'src/lib/apollo/documents')
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts')

  // Pre-pass: collect every `export const X = gql\`…\`` blob (fragments OR
  // documents) so we can expand `${X}` interpolations referenced by other
  // documents.
  const fragmentTexts = new Map<string, string>()
  for (const f of files) {
    const text = readFileSync(resolve(dir, f), 'utf8')
    for (const m of text.matchAll(FRAGMENT_EXPORT_RE)) {
      fragmentTexts.set(m[1]!, m[2]!)
    }
  }

  function expand(body: string): string {
    return body.replace(/\$\{(\w+)\}/g, (_, name) => fragmentTexts.get(name) ?? '')
  }

  // Only check documents that are actually re-exported from index.ts — this
  // skips dead-code placeholders like the old `RetreatServerPingDocument`
  // (which intentionally references a non-existent `ping` field as a setup hint).
  const indexText = readFileSync(resolve(dir, 'index.ts'), 'utf8')
  const exported = new Set<string>()
  for (const m of indexText.matchAll(/\b(\w*Document)\b/g)) {
    exported.add(m[1]!)
  }

  const out: { name: string; rawSource: string; doc: DocumentNode }[] = []
  for (const f of files) {
    const text = readFileSync(resolve(dir, f), 'utf8')
    const re = /export\s+const\s+(\w*Document)\s*=\s*gql\s*`([\s\S]*?)`/g
    for (const m of text.matchAll(re)) {
      const name = m[1]!
      if (!exported.has(name)) continue
      const body = expand(m[2]!)
      try {
        out.push({ name, rawSource: body, doc: parse(body) })
      } catch (err) {
        console.error(`Failed to parse ${name} in ${f}:`, (err as Error).message)
      }
    }
  }
  return out
}

async function postGql<T = unknown>(
  url: string,
  body: { query: string; variables?: Record<string, unknown>; operationName?: string },
): Promise<{ status: number; json?: { data?: T; errors?: { message: string; extensions?: { code?: string } }[] }; bodyText?: string }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30_000)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      return { status: res.status, bodyText: txt }
    }
    const json = (await res.json()) as never
    return { status: res.status, json }
  } finally {
    clearTimeout(timer)
  }
}

async function main(): Promise<void> {
  const { endpoints, failOnAuthErrors } = parseArgs(process.argv.slice(2))
  let totalFailures = 0

  const documents = loadDocuments()
  console.log(`Found ${documents.length} gql document(s) to check: ${documents.map((d) => d.name).join(', ')}\n`)

  for (const ep of endpoints) {
    console.log(`=== ${ep.label} (${ep.url}) ===`)

    // 1) Introspect the endpoint's schema once.
    const introspectionRes = await postGql<IntrospectionQuery>(ep.url, { query: getIntrospectionQuery() })
    let schema = null
    if (introspectionRes.status !== 200 || !introspectionRes.json?.data) {
      console.warn(
        `  ! introspection failed (HTTP ${introspectionRes.status}). Some routers (Apollo Router in non-dev) disable introspection — skipping schema validation, will still execute queries.`,
      )
    } else {
      schema = buildClientSchema(introspectionRes.json.data)
    }

    for (const d of documents) {
      // 2) Static schema validation (when introspection is available).
      if (schema) {
        const errs = validate(schema, d.doc)
        if (errs.length > 0) {
          console.error(`  ✗ ${d.name} — validation: ${errs.map((e) => e.message).join('; ')}`)
          totalFailures += 1
          continue
        }
      }

      // 3) Execute the query (with sample vars if defined).
      const opName = (() => {
        for (const def of d.doc.definitions) {
          if (def.kind === 'OperationDefinition' && def.name?.value) return def.name.value
        }
        return undefined
      })()
      const exec = await postGql(ep.url, {
        query: d.rawSource,
        variables: SAMPLE_VARS[d.name] || undefined,
        operationName: opName,
      })
      if (exec.status !== 200) {
        console.error(`  ✗ ${d.name} — HTTP ${exec.status}: ${exec.bodyText?.slice(0, 200) ?? ''}`)
        totalFailures += 1
        continue
      }
      const errs = exec.json?.errors ?? []
      if (errs.length > 0) {
        const isAuthOnly = errs.every((e) =>
          /not allowed|forbidden|unauthorized/i.test(e.message) ||
          e.extensions?.code === 'FORBIDDEN' ||
          e.extensions?.code === 'UNAUTHENTICATED',
        )
        const tag = isAuthOnly && !failOnAuthErrors ? '⚠ auth-only' : '✗'
        console.error(`  ${tag} ${d.name} — errors: ${errs.map((e) => e.message).join('; ')}`)
        if (!isAuthOnly || failOnAuthErrors) totalFailures += 1
        continue
      }
      console.log(`  ✓ ${d.name}`)
    }
    console.log('')
  }

  if (totalFailures > 0) {
    console.error(`Failures: ${totalFailures}`)
    process.exit(1)
  }
  console.log('All checks passed.')
}

await main()
