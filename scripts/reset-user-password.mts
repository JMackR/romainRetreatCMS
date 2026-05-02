/**
 * Reset a user's login password (Payload hashes it like normal signup).
 *
 *   RESET_EMAIL=jim@example.com RESET_PASSWORD='your-new-secret' yarn tsx scripts/reset-user-password.mts
 *
 * Or omit RESET_PASSWORD to auto-generate a random one (printed once).
 */
import 'dotenv/config'
import { randomBytes } from 'node:crypto'

import { getPayload } from 'payload'
import type { Config } from 'payload'

import config from '../src/payload.config.js'

async function main() {
  const email = (process.env.RESET_EMAIL || '').trim().toLowerCase()
  let password = process.env.RESET_PASSWORD

  if (!email) {
    console.error('Set RESET_EMAIL (e.g. RESET_EMAIL=jim@modsquad.io).')
    process.exit(1)
  }

  if (!process.env.DATABASE_URL || !process.env.PAYLOAD_SECRET) {
    console.error('DATABASE_URL and PAYLOAD_SECRET must be set (same as yarn dev).')
    process.exit(1)
  }

  if (!password || password.length < 8) {
    password = randomBytes(12).toString('base64url')
    console.error('[info] RESET_PASSWORD not set or too short — using a generated password (shown below).')
  }

  const cfg = (await Promise.resolve(config)) as Config
  const payload = await getPayload({ config: cfg })

  const found = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })

  if (found.docs.length === 0) {
    console.error(`No user found with email: ${email}`)
    process.exit(1)
  }

  const id = found.docs[0].id

  await payload.update({
    collection: 'users',
    id,
    data: { password },
    overrideAccess: true,
  })

  console.log(`Password updated for ${email} (id=${id}).`)
  console.log('')
  console.log('New password (save it now; it will not be shown again):')
  console.log(password)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
