/**
 * One-time fix: posts created when `body` was a textarea store plain text.
 * After switching to richText, Drizzle JSON-parses `body` and crashes on plain text.
 * This rewrites those rows to Lexical JSON via buildDefaultEditorState.
 */
import 'dotenv/config'

import { createClient } from '@libsql/client'
import { buildDefaultEditorState } from '@payloadcms/richtext-lexical'
import path from 'node:path'

function resolveSqliteUrl(databaseUrl: string): string {
  const trimmed = databaseUrl.trim()
  if (!trimmed.startsWith('file:')) {
    throw new Error(`Expected DATABASE_URL to start with file: (got ${trimmed.slice(0, 20)}…)`)
  }
  const rest = trimmed.slice('file:'.length).replace(/^\/+/, '')
  const absolute = path.isAbsolute(rest) ? rest : path.resolve(process.cwd(), rest)
  return `file:${absolute}`
}

function needsLexicalMigration(body: string): boolean {
  const t = body.trim()
  if (!t.startsWith('{')) return true
  try {
    const parsed: unknown = JSON.parse(t)
    if (!parsed || typeof parsed !== 'object') return true
    const root = (parsed as { root?: { type?: string } }).root
    return root?.type !== 'root'
  } catch {
    return true
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  const url = resolveSqliteUrl(databaseUrl)
  const client = createClient({ url })

  const { rows } = await client.execute('SELECT id, body FROM posts')

  let updated = 0
  for (const row of rows as unknown as { id: number; body: string }[]) {
    const body = row.body
    if (!needsLexicalMigration(body)) continue

    const state = buildDefaultEditorState({ text: body })
    const json = JSON.stringify(state)
    await client.execute({
      sql: 'UPDATE posts SET body = ? WHERE id = ?',
      args: [json, row.id],
    })
    updated += 1
    console.log(`Migrated post id=${row.id}`)
  }

  if (updated === 0) {
    console.log('No posts needed migration (already Lexical JSON).')
  } else {
    console.log(`Done. Migrated ${updated} post(s).`)
  }
  process.exit(0)
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
