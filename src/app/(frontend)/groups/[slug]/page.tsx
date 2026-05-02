import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import type { Group, GroupEvent, GroupPost, GroupMember, User, Media } from '@/payload-types'
import { getMeUserOptional } from '@/utilities/getMeUserOptional'

import { GroupViewClient } from './GroupViewClient'

type Args = { params: Promise<{ slug?: string }> }

const load = cache(async (slug: string) => {
  const payload = await getPayload({ config: configPromise })
  const g = await payload.find({
    collection: 'groups',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  const group = g.docs[0] as Group | undefined
  if (!group) return null

  const [posts, members, events, meWrap] = await Promise.all([
    payload.find({
      collection: 'groupPosts',
      where: { group: { equals: group.id } },
      limit: 100,
      sort: '-createdAt',
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'groupMembers',
      where: { and: [{ group: { equals: group.id } }, { status: { equals: 'active' } }] },
      limit: 500,
      sort: 'createdAt',
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'groupEvents',
      where: { group: { equals: group.id } },
      limit: 50,
      sort: 'startsAt',
      depth: 1,
      overrideAccess: true,
    }),
    getMeUserOptional(),
  ])

  const me = meWrap?.user ?? null
  let isMember = false
  let isAdmin = false
  if (me) {
    const m = await payload.find({
      collection: 'groupMembers',
      where: {
        and: [
          { group: { equals: group.id } },
          { user: { equals: me.id } },
          { status: { equals: 'active' } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })
    const row = m.docs[0] as GroupMember | undefined
    isMember = row !== undefined
    isAdmin = row?.role === 'admin' || row?.role === 'moderator'
  }

  const postDocs = posts.docs as GroupPost[]
  const postIds = postDocs.map((p) => p.id)
  const mediaFromPosts: Media[] = []
  const seen = new Set<number>()
  for (const p of postDocs) {
    const ph = p.photos
    if (!ph) continue
    for (const x of ph) {
      const m = typeof x === 'object' && x && 'id' in x ? (x as Media) : null
      if (m && typeof m.id === 'number' && !seen.has(m.id)) {
        seen.add(m.id)
        mediaFromPosts.push(m)
      }
    }
  }

  const likeByPost: Record<string, number> = {}
  const myPostLikeId: Record<string, number> = {}
  let commentsByPost: Record<string, import('@/payload-types').GroupComment[]> = {}
  if (postIds.length) {
    const comments = await payload.find({
      collection: 'groupComments',
      where: { post: { in: postIds } },
      limit: 2000,
      sort: 'createdAt',
      overrideAccess: true,
    })
    for (const c of comments.docs) {
      const com = c as import('@/payload-types').GroupComment
      const pid = typeof com.post === 'object' && com.post && 'id' in com.post ? com.post.id : com.post
      const k = String(pid)
      if (!commentsByPost[k]) commentsByPost[k] = []
      commentsByPost[k].push(com)
    }
  }

  if (postIds.length) {
    const likes = await payload.find({
      collection: 'groupPostLikes',
      where: { post: { in: postIds } },
      limit: 5000,
      overrideAccess: true,
    })
    for (const d of likes.docs) {
      const l = d as { id: number; post: number | { id: number }; user: number }
      const pid = typeof l.post === 'object' && l.post && 'id' in l.post ? l.post.id : l.post
      const k = String(pid)
      likeByPost[k] = (likeByPost[k] || 0) + 1
      if (me) {
        const uid = l.user
        if (uid === me.id) {
          myPostLikeId[k] = l.id
        }
      }
    }
  }

  return {
    group,
    initialPosts: postDocs,
    members: members.docs as GroupMember[],
    initialEvents: events.docs as GroupEvent[],
    allMedia: mediaFromPosts,
    isMember,
    isAdmin,
    me,
    likeByPost,
    myPostLikeId,
    commentsByPost,
  }
})

export default async function GroupBySlugPage({ params: p }: Args) {
  const { slug: raw = '' } = await p
  const slug = decodeURIComponent(raw)
  const data = await load(slug)
  if (!data) notFound()
  return (
    <GroupViewClient
      allMedia={data.allMedia}
      group={data.group}
      initialEvents={data.initialEvents}
      initialPosts={data.initialPosts}
      isAdmin={data.isAdmin}
      isMember={data.isMember}
      likeByPost={data.likeByPost}
      members={data.members}
      me={data.me}
      myPostLikeId={data.myPostLikeId}
      commentsByPost={data.commentsByPost}
    />
  )
}

export async function generateMetadata({ params: p }: Args): Promise<Metadata> {
  const { slug: raw = '' } = await p
  const data = await load(decodeURIComponent(raw))
  if (!data) return { title: 'Group' }
  return { title: data.group.name, description: data.group.shortDescription || undefined }
}
