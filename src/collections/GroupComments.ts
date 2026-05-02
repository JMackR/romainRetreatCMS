import type { Access, CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import type { GroupComment, GroupPost } from '@/payload-types'
import { getUserDisplayName } from '@/utilities/userDisplayName'
import { isValidAccessDocumentId, relId } from './Groups/relId'
import { isActiveMember, isGroupAdmin } from './Groups/shared'

async function groupIdFromPost(
  payload: import('payload').Payload,
  req: import('payload').PayloadRequest,
  postRef: string | number | { id: string | number } | null | undefined,
): Promise<string> {
  const postId = relId(postRef)
  if (!postId) return ''
  const post = await payload.findByID({
    collection: 'groupPosts',
    id: postId,
    depth: 0,
    req,
  })
  return relId((post as GroupPost).group)
}

const read: Access = anyone

const create: Access = async ({ req, data }) => {
  if (!req.user) return false
  const d = (data || {}) as { post?: string | { id: string } }
  const postId = relId(d.post)
  if (!postId) return false
  let post: GroupPost
  try {
    post = (await req.payload.findByID({
      collection: 'groupPosts',
      id: postId,
      depth: 0,
    })) as GroupPost
  } catch {
    return false
  }
  if (post.commentsEnabled === false) return false
  const groupId = relId(post.group)
  if (!groupId) return false
  return isActiveMember({ payload: req.payload, req, groupId, user: req.user })
}

const update: Access = async ({ req, id }) => {
  if (!req.user) return false
  if (!isValidAccessDocumentId(id)) return false
  let c: GroupComment
  try {
    c = (await req.payload.findByID({
      collection: 'groupComments',
      id: String(id),
      depth: 0,
    })) as GroupComment
  } catch {
    return false
  }
  const postId = relId(c.post)
  const groupId = await groupIdFromPost(req.payload, req, postId)
  const authorId = relId(c.author)
  if (authorId === String(req.user.id)) return true
  return isGroupAdmin({ payload: req.payload, req, groupId }, req.user)
}

const del: Access = update

export const GroupComments: CollectionConfig = {
  slug: 'groupComments',
  labels: { singular: 'Group comment', plural: 'Group comments' },
  admin: {
    defaultColumns: ['authorName', 'post', 'updatedAt'],
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
      name: 'post',
      type: 'relationship',
      relationTo: 'groupPosts',
      required: true,
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      admin: { description: 'Set from the signed-in user on create (beforeChange).' },
    },
    {
      name: 'authorName',
      type: 'text',
      admin: { readOnly: true },
    },
    {
      name: 'text',
      type: 'textarea',
      required: true,
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req, originalDoc }) => {
        if (data == null) return data
        const d = { ...data } as {
          author?: string | { id: string }
          authorName?: string
        }
        if (operation === 'create' && req.user) {
          d.author = d.author || String(req.user.id)
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
          d.authorName = (originalDoc as GroupComment).authorName ?? undefined
        }
        return d
      },
    ],
  },
  timestamps: true,
}
