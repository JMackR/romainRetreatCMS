/**
 * Apply schema to Postgres via postgresAdapter `push` (dev / first-time).
 * Requires `DATABASE_URL`, `PAYLOAD_SECRET`, and `PAYLOAD_DATABASE_PUSH=1` in `.env`.
 * Run: `yarn db:push` or `PAYLOAD_DATABASE_PUSH=1 npx tsx scripts/sync-postgres.mts`
 */
import 'dotenv/config'

import { getPayload } from 'payload'
import type { Config } from 'payload'

import config from '../src/payload.config.ts'

const main = async () => {
  if (process.env.PAYLOAD_DATABASE_PUSH !== '1' && process.env.PAYLOAD_DATABASE_PUSH !== 'true') {
    console.error('Set PAYLOAD_DATABASE_PUSH=1 in .env (or run: PAYLOAD_DATABASE_PUSH=1 yarn db:push)')
    process.exit(1)
  }
  await getPayload({ config: config as Config })
  console.log('Postgres is in sync with the Payload config (Drizzle push on init).')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
