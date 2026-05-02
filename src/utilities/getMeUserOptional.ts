import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import type { User } from '@/payload-types'

/**
 * Resolves the current user from the request cookies via Payload (no HTTP self-fetch), so
 * it works in RSC on any port and does not require the dev server to accept new connections.
 */
export async function getMeUserOptional(): Promise<{ user: User } | null> {
  const cookieStore = await cookies()
  if (!cookieStore.get('payload-token')?.value) return null

  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return null
  return { user: user as User }
}
