/**
 * Set a user's `role` (admin | contentManager | consumer). Uses overrideAccess
 * so you can recover when locked out of admin.
 *
 *   RESET_EMAIL=jim@modsquad.io RESET_ROLE=admin yarn tsx scripts/set-user-role.mts
 */
import 'dotenv/config'

import { getPayload } from 'payload'
import type { Config } from 'payload'

import { ROLE, type UserRole } from '../src/access/roles.js'
import config from '../src/payload.config.js'

const ALLOWED: UserRole[] = [ROLE.ADMIN, ROLE.CONTENT_MANAGER, ROLE.CONSUMER]

async function main() {
  const email = (process.env.RESET_EMAIL || '').trim().toLowerCase()
  const role = (process.env.RESET_ROLE || '').trim() as UserRole

  if (!email) {
    console.error('Set RESET_EMAIL.')
    process.exit(1)
  }
  if (!ALLOWED.includes(role)) {
    console.error(`Set RESET_ROLE to one of: ${ALLOWED.join(', ')}`)
    process.exit(1)
  }
  if (!process.env.DATABASE_URL || !process.env.PAYLOAD_SECRET) {
    console.error('DATABASE_URL and PAYLOAD_SECRET must be set.')
    process.exit(1)
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
    console.error(`No user found: ${email}`)
    process.exit(1)
  }

  const doc = found.docs[0]
  const prev = (doc as { role?: string }).role

  await payload.update({
    collection: 'users',
    id: doc.id,
    data: { role },
    overrideAccess: true,
  })

  console.log(`Updated ${email} (id=${doc.id}): role ${prev ?? '(none)'} → ${role}`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
