import type { Access, CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import type { Group, GroupMember } from '@/payload-types'
import { isValidAccessDocumentId, relId } from './Groups/relId'
import { findMembership, isGroupAdmin } from './Groups/shared'

const read: Access = anyone

const create: Access = async ({ req, data }) => {
  if (!req.user) return false
  const d = (data || {}) as {
    user?: string | { id: string }
    group?: string | { id: string }
  }
  const userId = relId(d.user)
  const groupId = relId(d.group)
  if (!userId || !groupId) return false

  if (userId !== String(req.user.id)) {
    return isGroupAdmin({ payload: req.payload, req, groupId }, req.user)
  }

  const g = await req.payload.findByID({
    collection: 'groups',
    id: groupId,
    depth: 0,
  })
  if (g.privacy === 'public') return true

  const createdBy = relId((g as Group).createdBy)
  if (createdBy && createdBy === userId) return true
  if (g.privacy === 'private' && (await isGroupAdmin({ payload: req.payload, req, groupId }, req.user)))
    return true
  return false
}

const update: Access = async ({ req, id, data: _data }) => {
  if (!req.user) return false
  if (!isValidAccessDocumentId(id)) return false
  let m: GroupMember
  try {
    m = (await req.payload.findByID({
      collection: 'groupMembers',
      id: String(id),
      depth: 0,
    })) as GroupMember
  } catch {
    return false
  }
  const groupId = relId(m.group)
  const memUser = relId(m.user)
  if (memUser === String(req.user.id)) return true
  return isGroupAdmin({ payload: req.payload, req, groupId }, req.user)
}

const del: Access = update

export const GroupMembers: CollectionConfig = {
  slug: 'groupMembers',
  labels: { singular: 'Group member', plural: 'Group members' },
  admin: {
    defaultColumns: ['group', 'user', 'role', 'status', 'updatedAt'],
    useAsTitle: 'id',
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
      hasMany: false,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'member',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Moderator', value: 'moderator' },
        { label: 'Member', value: 'member' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Invited', value: 'invited' },
        { label: 'Left', value: 'left' },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req, originalDoc }) => {
        if (operation === 'create' && data) {
          const d = data as { group?: string | { id: string }; user?: string | { id: string } }
          const gId = relId(d.group)
          const uId = relId(d.user)
          const found = await req.payload.find({
            collection: 'groupMembers',
            where: {
              and: [{ group: { equals: gId } }, { user: { equals: uId } }],
            },
            limit: 1,
          })
          if (found.totalDocs > 0) {
            const a = (found.docs[0] as GroupMember).id
            const b = (originalDoc as GroupMember | undefined)?.id
            const isSameDoc = b != null && String(a) === String(b)
            if (!isSameDoc) {
              throw new Error('This user is already a member of this group.')
            }
          }
        }
        return data
      },
    ],
  },
  timestamps: true,
}
