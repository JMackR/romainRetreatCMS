import type { Access, CollectionConfig, Where } from 'payload'

import type { GroupInvite, User } from '@/payload-types'
import { isValidAccessDocumentId, relId } from './Groups/relId'
import { isGroupAdmin } from './Groups/shared'

const read: Access = async ({ req, id }) => {
  if (!req.user) return false
  if (isValidAccessDocumentId(id)) {
    let inv: GroupInvite
    try {
      inv = (await req.payload.findByID({
        collection: 'groupInvites',
        id: String(id),
        depth: 0,
      })) as GroupInvite
    } catch {
      return false
    }
    const invBy = relId(inv.invitedBy)
    if (invBy === String(req.user.id)) return true
    const me = req.user as User
    if (me.email && inv.email === me.email) return true
    const gId = relId(inv.group)
    if (gId) return isGroupAdmin({ payload: req.payload, req, groupId: gId }, req.user)
    return false
  }
  const u = req.user as User
  return {
    or: [
      { email: { equals: u.email } },
      { invitedBy: { equals: u.id } },
    ],
  } as Where
}

const create: Access = async ({ req, data }) => {
  if (!req.user) return false
  const d = (data || {}) as { group?: string | { id: string } }
  const groupId = relId(d.group)
  if (!groupId) return false
  return isGroupAdmin({ payload: req.payload, req, groupId }, req.user)
}

const update: Access = async ({ req, id, data: _d }) => {
  if (!req.user || !isValidAccessDocumentId(id)) return false
  let inv: GroupInvite
  try {
    inv = (await req.payload.findByID({
      collection: 'groupInvites',
      id: String(id),
      depth: 0,
    })) as GroupInvite
  } catch {
    return false
  }
  const me = req.user as User
  if (me.email && inv.email === me.email) return true
  const gId = relId(inv.group)
  return isGroupAdmin({ payload: req.payload, req, groupId: gId }, req.user)
}

const del: Access = update

export const GroupInvites: CollectionConfig = {
  slug: 'groupInvites',
  labels: { singular: 'Group invite', plural: 'Group invites' },
  admin: {
    defaultColumns: ['email', 'status', 'group', 'updatedAt'],
    useAsTitle: 'email',
  },
  access: {
    create,
    read,
    update,
    delete: del,
  },
  fields: [
    {
      name: 'group',
      type: 'relationship',
      relationTo: 'groups',
      required: true,
    },
    {
      name: 'invitedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'message',
      type: 'textarea',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Declined', value: 'declined' },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (data == null) return data
        const d = { ...data } as { invitedBy?: string | { id: string } }
        if (operation === 'create' && req.user) {
          d.invitedBy = d.invitedBy || String(req.user.id)
        }
        return d
      },
    ],
  },
  timestamps: true,
}
