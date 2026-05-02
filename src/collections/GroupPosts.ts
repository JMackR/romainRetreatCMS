import type { Access, CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import type { GroupPost } from '@/payload-types'
import { getUserDisplayName } from '@/utilities/userDisplayName'
import { isValidAccessDocumentId, relId } from './Groups/relId'
import { isActiveMember, isGroupAdmin } from './Groups/shared'

const read: Access = anyone

const create: Access = async ({ req, data }) => {
  if (!req.user) return false
  const d = (data || {}) as { group?: string | { id: string } }
  const groupId = relId(d.group)
  if (!groupId) return false
  if (!(await isActiveMember({ payload: req.payload, req, groupId, user: req.user })))
    return false
  return true
}

const update: Access = async ({ req, id, data: _d }) => {
  if (!req.user) return false
  if (!isValidAccessDocumentId(id)) return false
  let doc: GroupPost
  try {
    doc = (await req.payload.findByID({
      collection: 'groupPosts',
      id: String(id),
      depth: 0,
    })) as GroupPost
  } catch {
    return false
  }
  const groupId = relId(doc.group)
  const authorId = relId(doc.author)
  if (authorId === String(req.user.id)) return true
  return isGroupAdmin({ payload: req.payload, req, groupId }, req.user)
}

const del: Access = update

export const GroupPosts: CollectionConfig = {
  slug: 'groupPosts',
  labels: { singular: 'Group post', plural: 'Group posts' },
  admin: {
    defaultColumns: ['authorName', 'postType', 'commentsEnabled', 'group', 'updatedAt'],
    useAsTitle: 'authorName',
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
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      /** Validated in beforeChange (req.user) — required validation runs before hooks, so not required here. */
      required: false,
      admin: { description: 'Set by the post creator (or from your session on the site).' },
    },
    {
      name: 'authorName',
      type: 'text',
      admin: { readOnly: true },
    },
    {
      name: 'postType',
      type: 'select',
      required: true,
      defaultValue: 'discussion',
      options: [
        { label: 'Discussion', value: 'discussion' },
        { label: 'Open question', value: 'question' },
        { label: 'Announcement', value: 'announcement' },
      ],
    },
    {
      name: 'text',
      type: 'textarea',
      required: true,
    },
    {
      name: 'commentsEnabled',
      type: 'checkbox',
      defaultValue: true,
      label: 'Allow comments',
      admin: {
        description: 'If off, members cannot add new comments on this post.',
      },
    },
    {
      name: 'photos',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      label: 'Photos',
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req, originalDoc }) => {
        if (data == null) return data
        const d = { ...data } as {
          author?: string | number | { id: string | number }
          authorName?: string
        }
        if (operation === 'create' && req.user) {
          d.author = d.author ?? String(req.user.id)
        }
        if (operation === 'create' && !relId(d.author)) {
          throw new Error('Author is required to create a post')
        }
        const authorId = relId(d.author)
        if (authorId) {
          const u = await req.payload.findByID({
            collection: 'users',
            id: authorId,
            depth: 0,
            overrideAccess: true,
            req,
          })
          d.authorName =
            getUserDisplayName(
              u as { firstName?: string | null; lastName?: string | null; email?: string; name?: string | null },
            ) || `user-${authorId}`
        } else if (operation === 'update' && originalDoc) {
          d.authorName = (originalDoc as GroupPost).authorName ?? undefined
        }
        return d
      },
    ],
  },
  timestamps: true,
}
