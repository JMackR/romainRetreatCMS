import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import type { User } from '@/payload-types'

export const getMeUser = async (args?: {
  nullUserRedirect?: string
  validUserRedirect?: string
}): Promise<{
  token: string
  user: User
}> => {
  const { nullUserRedirect, validUserRedirect } = args || {}
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  const u = user as User | null

  if (validUserRedirect && u) {
    redirect(validUserRedirect)
  }

  if (nullUserRedirect && !u) {
    redirect(nullUserRedirect)
  }

  if (!u) {
    throw new Error('getMeUser: not authenticated (pass nullUserRedirect to redirect to login instead)')
  }

  return {
    token: token ?? '',
    user: u,
  }
}
