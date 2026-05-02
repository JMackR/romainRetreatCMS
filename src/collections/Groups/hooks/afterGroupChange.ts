import type { CollectionAfterChangeHook } from 'payload'

import { findMembership } from '../shared'

export const afterGroupCreateAddAdmin: CollectionAfterChangeHook = async ({
  operation,
  doc,
  req,
}) => {
  if (operation !== 'create' || !req.user || !doc?.id) return doc

  const groupId = String(doc.id)
  const userId = String(req.user.id)

  const already = await findMembership({
    payload: req.payload,
    req,
    groupId,
    userId,
  })
  if (already) return doc

  await req.payload.create({
    collection: 'groupMembers',
    data: {
      group: doc.id,
      user: req.user.id,
      role: 'admin',
      status: 'active',
    },
    overrideAccess: true,
    req,
  })

  return doc
}
