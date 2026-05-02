import type { CollectionSlug, Payload, PayloadRequest, TypedUser } from 'payload'

import type { User } from '@/payload-types'

const membersSlug = 'groupMembers' as CollectionSlug

type MemberDoc = { id: string; role: 'admin' | 'moderator' | 'member' }

type PayloadWithReq = { payload: Payload; req: PayloadRequest }

export async function findMembership(
  { payload, req, groupId, userId }: PayloadWithReq & { groupId: string; userId: string },
): Promise<MemberDoc | null> {
  const res = await payload.find({
    collection: membersSlug,
    where: {
      and: [
        { group: { equals: groupId } },
        { user: { equals: userId } },
        { status: { equals: 'active' } },
      ],
    },
    limit: 1,
    overrideAccess: true,
    req,
  })
  const d = res.docs[0] as unknown as MemberDoc | undefined
  return d ?? null
}

export async function isGroupAdmin(
  { payload, req, groupId }: PayloadWithReq & { groupId: string },
  user: TypedUser | null | User | false | undefined,
): Promise<boolean> {
  if (!user) return false
  const m = await findMembership({
    payload,
    req,
    groupId,
    userId: String(user.id),
  })
  return m?.role === 'admin' || m?.role === 'moderator'
}

export async function isActiveMember(
  args: PayloadWithReq & { groupId: string; user: TypedUser | null | User | false | undefined },
): Promise<boolean> {
  const { user, ...rest } = args
  if (!user) return false
  return (await findMembership({ ...rest, userId: String(user.id) })) !== null
}
