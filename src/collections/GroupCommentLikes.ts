import type { Access, CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import type { GroupComment, GroupCommentLike, GroupPost } from '@/payload-types'
import { isValidAccessDocumentId, relId } from './Groups/relId'
import { isActiveMember } from './Groups/shared'

async function groupIdFromComment(
  payload: import('payload').Payload,
  req: import('payload').PayloadRequest,
  commentRef: string | number | { id: string | number } | null | undefined,
): Promise<string> {
  const cId = relId(commentRef)
  if (!cId) return ''
  const c = await payload.findByID({
    collection: 'groupComments',
    id: cId,
    depth: 0,
    req,
  })
  const postId = relId((c as GroupComment).post)
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
  const d = (data || {}) as { comment?: string | { id: string } }
  const cId = relId(d.comment)
  if (!cId) return false
  const groupId = await groupIdFromComment(req.payload, req, cId)
  if (!groupId) return false
  return isActiveMember({ payload: req.payload, req, groupId, user: req.user })
}

const never: Access = () => false

const del: Access = async ({ req, id }) => {
  if (!req.user || !isValidAccessDocumentId(id)) return false
  let doc: GroupCommentLike
  try {
    doc = (await req.payload.findByID({
      collection: 'groupCommentLikes',
      id: String(id),
      depth: 0,
    })) as GroupCommentLike
  } catch {
    return false
  }
  const u = relId(doc.user)
  return u === String(req.user.id)
}

export const GroupCommentLikes: CollectionConfig = {
  slug: 'groupCommentLikes',
  labels: { singular: 'Comment like', plural: 'Comment likes' },
  access: {
    create,
    read,
    update: never,
    delete: del,
  },
  fields: [
    {
      name: 'comment',
      type: 'relationship',
      relationTo: 'groupComments',
      required: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req, originalDoc }) => {
        if (data == null) return data
        const d = { ...data } as { comment?: string | { id: string }; user?: string | { id: string } }
        if (operation === 'create' && req.user) {
          d.user = d.user || String(req.user.id)
        }
        if (d.comment && d.user) {
          const cId = relId(d.comment)
          const uId = relId(d.user)
          const ext = await req.payload.find({
            collection: 'groupCommentLikes',
            where: {
              and: [{ comment: { equals: cId } }, { user: { equals: uId } }],
            },
            limit: 1,
          })
          if (ext.totalDocs > 0) {
            const isSame =
              originalDoc &&
              String((ext.docs[0] as GroupCommentLike).id) ===
                String((originalDoc as GroupCommentLike).id)
            if (!isSame) {
              throw new Error('You already liked this comment.')
            }
          }
        }
        return d
      },
    ],
  },
  timestamps: true,
}
