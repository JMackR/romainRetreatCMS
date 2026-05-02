/**
 * CLI wrapper around `src/endpoints/seed/index.ts:seed` (the same function the
 * `/next/seed` HTTP route calls). Lets you populate any Payload-pointed DB
 * (local docker postgres, host postgres, AWS Aurora, …) with the demo author,
 * categories, media, 3 sample posts, contact form, home/contact pages, and
 * header/footer globals — all in one shot, without needing the Next.js server
 * running or an authenticated cookie.
 *
 * Usage from `romainRetreatCMS`:
 *   yarn seed                        # seed the DB pointed at by .env's DATABASE_URL
 *   yarn seed --force                # tear down + reseed even if rows already exist
 *   DATABASE_URL=… yarn seed         # seed an arbitrary DB (e.g. AWS Aurora)
 *
 * The script EXITS WITHOUT WRITING when the DB already contains posts unless
 * `--force` is passed (the underlying `seed()` function unconditionally clears
 * collections, so `--force` is the explicit "yes, blow away current data" flag).
 *
 * The script also runs the schema push (`Drizzle push`) automatically when the
 * `posts` table doesn't exist — useful for a brand-new DB (local docker init,
 * fresh Aurora cluster) where we don't want a separate `yarn db:push` step.
 */
import 'dotenv/config'

import { createLocalReq, getPayload } from 'payload'
import type { Config } from 'payload'

import config from '../src/payload.config.js'
import { seed } from '../src/endpoints/seed/index.js'

async function main() {
  if (!process.env.DATABASE_URL || !process.env.PAYLOAD_SECRET) {
    console.error('Missing DATABASE_URL or PAYLOAD_SECRET. Set them in .env (or pass via env vars when invoking the script).')
    process.exit(1)
  }

  const force = process.argv.includes('--force')

  // Auto-push schema on fresh DBs so new local-docker / new Aurora installs
  // don't need a separate `yarn db:push` step. Existing tables → Payload's
  // adapter is a no-op.
  if (!process.env.PAYLOAD_DATABASE_PUSH) {
    process.env.PAYLOAD_DATABASE_PUSH = '1'
  }

  const cfg = (await Promise.resolve(config)) as Config
  const payload = await getPayload({ config: cfg })

  if (!force) {
    try {
      const { totalDocs } = await payload.count({ collection: 'posts', overrideAccess: true })
      if (totalDocs > 0) {
        console.log(
          `Skip: ${totalDocs} post(s) already exist. Pass --force to wipe collections and re-seed (this is destructive).`,
        )
        process.exit(0)
      }
    } catch (err) {
      // If `posts` table doesn't exist yet the count throws — fall through and
      // let `seed()` push the schema and create rows on a fresh DB.
      payload.logger.info(
        { err: (err as Error).message },
        'posts collection not queryable yet (fresh DB?) — proceeding with seed',
      )
    }
  }

  // `seed()` expects a PayloadRequest; the HTTP route uses a real authenticated
  // user, but for the CLI we just synthesize an admin request via createLocalReq
  // (no `user` → `req.user` is undefined, all writes use `overrideAccess`).
  const req = await createLocalReq({}, payload)
  await seed({ payload, req })

  console.log('Done.')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
