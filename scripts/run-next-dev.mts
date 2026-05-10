/**
 * Starts `next dev` with router env for local federation vs AWS.
 *
 *   yarn dev:fullstack — local Docker Apollo Router (see romainRetreatServer yarn docker:federation:up)
 *   yarn dev:ui       — AWS Router; set ROMAIN_RETREAT_SERVER_URL in .env.aws-ui.local
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'dotenv'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const mode = process.argv[2]

function localRouterUrl(): string {
  if (process.env.LOCAL_ROUTER_URL) {
    return process.env.LOCAL_ROUTER_URL.replace(/\/$/, '')
  }
  // Inside Docker / Dev Container, published host ports are reached via host.docker.internal
  // (compose should add extra_hosts: host.docker.internal:host-gateway on Linux).
  if (existsSync('/.dockerenv')) {
    return 'http://host.docker.internal:4000'
  }
  return 'http://127.0.0.1:4000'
}

const env: NodeJS.ProcessEnv = { ...process.env }

if (mode === 'fullstack') {
  env.ROMAIN_RETREAT_SERVER_URL = localRouterUrl()
  env.ROMAIN_RETREAT_SERVER_GRAPHQL_PATH = '/'
} else if (mode === 'ui') {
  const awsUiPath = resolve(root, '.env.aws-ui.local')
  let fromFile: Record<string, string> = {}
  if (existsSync(awsUiPath)) {
    fromFile = parse(readFileSync(awsUiPath, 'utf8'))
  }
  const url =
    fromFile.ROMAIN_RETREAT_SERVER_URL?.trim() ||
    process.env.ROMAIN_RETREAT_SERVER_URL?.trim()
  if (!url) {
    console.error(
      'dev:ui: set ROMAIN_RETREAT_SERVER_URL in .env.aws-ui.local (copy from .env.aws-ui.example).',
    )
    process.exit(1)
  }
  env.ROMAIN_RETREAT_SERVER_URL = url.replace(/\/$/, '')
  env.ROMAIN_RETREAT_SERVER_GRAPHQL_PATH =
    fromFile.ROMAIN_RETREAT_SERVER_GRAPHQL_PATH?.trim() ||
    process.env.ROMAIN_RETREAT_SERVER_GRAPHQL_PATH?.trim() ||
    '/'
} else {
  console.error('Usage: tsx scripts/run-next-dev.mts fullstack|ui')
  process.exit(1)
}

const r = spawnSync('yarn', ['dev'], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
process.exit(r.status ?? 1)
