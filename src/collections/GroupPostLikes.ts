import type { Access, CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import type { GroupPost, GroupPostLike } from '@/payload-types'
import { isValidAccessDocumentId, relId } from './Groups/relId'
import { isActiveMember } from './Groups/shared'

async function groupIdFromPost(
  payload: import('payload').Payload,
  req: import('payload').PayloadRequest,
  postRef: string | number | { id: string } | { id: number } | null | undefined,
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
  const d = (data || {}) as { post?: string | { id: string } | number }
  const postId = relId(d.post)
  if (!postId) return false
  const groupId = await groupIdFromPost(req.payload, req, postId)
  if (!groupId) return false
  return isActiveMember({ payload: req.payload, req, groupId, user: req.user })
}

const never: Access = () => false

const del: Access = async ({ req, id }) => {
  if (!req.user) return false
  if (!isValidAccessDocumentId(id)) return false
  let doc: GroupPostLike
  try {
    doc = (await req.payload.findByID({
      collection: 'groupPostLikes',
      id: String(id),
      depth: 0,
    })) as GroupPostLike
  } catch {
    return false
  }
  const u = relId(doc.user)
  return u === String(req.user.id)
}

export const GroupPostLikes: CollectionConfig = {
  slug: 'groupPostLikes',
  labels: { singular: 'Post like', plural: 'Post likes' },
  access: {
    create,
    read,
    update: never,
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
        const d = { ...data } as { post?: string | { id: string }; user?: string | { id: string } }
        if (operation === 'create' && req.user) {
          d.user = d.user || String(req.user.id)
        }
        if (d.post && d.user) {
          const pId = relId(d.post)
          const uId = relId(d.user)
          const ext = await req.payload.find({
            collection: 'groupPostLikes',
            where: {
              and: [{ post: { equals: pId } }, { user: { equals: uId } }],
            },
            limit: 1,
          })
          if (ext.totalDocs > 0) {
            const isSame =
              originalDoc &&
              String((ext.docs[0] as GroupPostLike).id) === String((originalDoc as GroupPostLike).id)
            if (!isSame) {
              throw new Error('You already liked this post.')
            }
          }
        }
        return d
      },
    ],
  },
  timestamps: true,
}
