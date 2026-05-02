'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Copy, Share2, UserPlus, X } from 'lucide-react'

import { GroupFeedCreatePost } from './GroupFeedCreatePost'
import { GroupPostCard, relAuthor } from './GroupPostCard'

import RichText from '@/components/RichText'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { getClientSideURL, getServerSideURL } from '@/utilities/getURL'
import { getUserDisplayName } from '@/utilities/userDisplayName'
import type { Group, GroupEvent, GroupPost, GroupMember, User, Media, GroupComment } from '@/payload-types'

import { cn } from '@/utilities/ui'

type Tab = 'discussion' | 'questions' | 'about' | 'members' | 'events' | 'media' | 'invite'

const tabs: { id: Tab; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'discussion', label: 'Discussion' },
  { id: 'questions', label: 'Open questions' },
  { id: 'members', label: 'Members' },
  { id: 'events', label: 'Events' },
  { id: 'media', label: 'Media' },
  { id: 'invite', label: 'Invite' },
]

function userLabel(
  u: string | number | { id: number; name?: string | null; email?: string } | null | undefined,
): string {
  if (u == null) return 'Member'
  if (typeof u === 'object' && (u as { name?: string | null }).name) {
    return String((u as { name: string }).name)
  }
  if (typeof u === 'object' && (u as { email?: string }).email) {
    return (u as { email: string }).email
  }
  if (typeof u === 'number') return `user ${u}`
  return `user ${u}`
}

function mediaUrl(m: Media, serverBase: string): string {
  const u = m.url
  if (!u) return ''
  return u.startsWith('http') ? u : `${serverBase}${u.startsWith('/') ? '' : '/'}${u}`
}

export function GroupViewClient({
  group,
  me,
  isMember: initialIsMember,
  isAdmin: initialIsAdmin,
  initialPosts,
  members,
  initialEvents,
  allMedia,
  likeByPost: initialLikes,
  myPostLikeId: initialMyLike,
  commentsByPost: initialComments,
}: {
  group: Group
  me: User | null
  isMember: boolean
  isAdmin: boolean
  initialPosts: GroupPost[]
  members: GroupMember[]
  initialEvents: GroupEvent[]
  allMedia: Media[]
  likeByPost: Record<string, number>
  myPostLikeId: Record<string, number>
  commentsByPost: Record<string, GroupComment[]>
}) {
  const [tab, setTab] = useState<Tab>('discussion')
  const [isMember, setIsMember] = useState(initialIsMember)
  const [isAdmin] = useState(initialIsAdmin)
  const [posts, setPosts] = useState(initialPosts)
  const [likeByPost, setLikeByPost] = useState(() => ({ ...initialLikes }))
  const [myPostLikeId, setMyPostLikeId] = useState(() => ({ ...initialMyLike }))
  const [commentsByPost, setCommentsByPost] = useState<Record<string, GroupComment[]>>(
    () => ({ ...initialComments }),
  )
  const [message, setMessage] = useState<string | null>(null)

  const [composerText, setComposerText] = useState('')
  const [postType, setPostType] = useState<GroupPost['postType']>('discussion')
  const [pendingPost, setPendingPost] = useState(false)
  const [files, setFiles] = useState<FileList | null>(null)
  const [commentsEnabled, setCommentsEnabled] = useState(true)

  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({})

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [invitePending, setInvitePending] = useState(false)

  const [composerOpen, setComposerOpen] = useState(false)

  const pathname = usePathname()
  const signInUrl = `/login?next=${encodeURIComponent(pathname || '/groups')}`

  const serverBase = getServerSideURL()
  const clientBase = getClientSideURL() || getServerSideURL()

  const userDisplayName = me ? getUserDisplayName(me) : null

  const openPostComposer = useCallback(() => {
    if (!me) {
      setMessage('Sign in to create a post')
      return
    }
    if (!isMember) {
      setMessage('Join the group to create a post')
      return
    }
    setComposerOpen(true)
  }, [isMember, me])

  const stubGroupFeature = useCallback(() => {
    if (!me) {
      setMessage('Sign in to use this')
      return
    }
    if (!isMember) {
      setMessage('Join the group to use this')
      return
    }
    setMessage('This feature is coming soon.')
  }, [isMember, me])

  useEffect(() => {
    if (!composerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setComposerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [composerOpen])

  const pageUrl = typeof window !== 'undefined' ? window.location.href : ''
  const cover = group.cover && typeof group.cover === 'object' ? (group.cover as Media) : null
  const coverBase = getClientSideURL() || getServerSideURL()
  const coverSrc = cover?.url
    ? cover.url.startsWith('http')
      ? cover.url
      : `${coverBase}${cover.url.startsWith('/') ? '' : '/'}${cover.url}`
    : null

  const filteredPosts = useMemo(() => {
    if (tab === 'questions') return posts.filter((p) => p.postType === 'question')
    if (tab === 'discussion') return posts.filter((p) => p.postType !== 'question')
    return []
  }, [posts, tab])

  const onShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : pageUrl
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url)
      setMessage('Link copied')
    }
    if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (d: ShareData) => void }).share) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ title: group.name, text: group.shortDescription || group.name, url })
      } catch {
        // ignore
      }
    }
  }, [group, pageUrl])

  const join = async () => {
    if (!me) {
      setMessage('Sign in to join')
      return
    }
    const r = await fetch(`${clientBase}/api/groupMembers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group: group.id, user: me.id, role: 'member', status: 'active' }),
      credentials: 'include',
    })
    if (r.ok) {
      setIsMember(true)
      setMessage("You're in.")
    } else {
      const b = (await r.json().catch(() => ({}))) as { errors?: { message: string }[] }
      setMessage(b.errors?.[0]?.message || 'Could not join')
    }
  }

  const uploadMedia = async (list: FileList) => {
    const ids: number[] = []
    for (const file of list) {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch(`${clientBase}/api/media`, { method: 'POST', body: fd, credentials: 'include' })
      if (r.ok) {
        const j = (await r.json()) as { doc?: { id: number } }
        if (j.doc?.id) ids.push(j.doc.id)
      }
    }
    return ids
  }

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!me) {
      setMessage('Sign in to post')
      return
    }
    if (!isMember) {
      setMessage('Join the group to post')
      return
    }
    setPendingPost(true)
    setMessage(null)
    try {
      let photos: number[] = []
      if (files && files.length) {
        photos = await uploadMedia(files)
      }
      const r = await fetch(`${clientBase}/api/groupPosts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: composerText,
          postType: (tab === 'questions' ? 'question' : postType) as GroupPost['postType'],
          group: group.id,
          author: me.id,
          commentsEnabled,
          ...(photos.length ? { photos } : {}),
        }),
        credentials: 'include',
      })
      const b = (await r.json().catch(() => ({}))) as { doc?: GroupPost; errors?: { message: string }[] }
      if (!r.ok) {
        setMessage(b.errors?.[0]?.message || 'Could not post')
        return
      }
      if (b.doc) setPosts((p) => [b.doc as GroupPost, ...p])
      setComposerText('')
      setFiles(null)
      setCommentsEnabled(true)
      setMessage('Posted')
      setComposerOpen(false)
    } finally {
      setPendingPost(false)
    }
  }

  const toggleLike = async (postId: number) => {
    if (!me || !isMember) {
      setMessage('Join and sign in to like')
      return
    }
    const k = String(postId)
    const has = myPostLikeId[k]
    if (has) {
      const r = await fetch(`${clientBase}/api/groupPostLikes/${has}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (r.ok) {
        setMyPostLikeId((m) => {
          const n = { ...m }
          delete n[k]
          return n
        })
        setLikeByPost((L) => ({ ...L, [k]: Math.max(0, (L[k] || 0) - 1) }))
      }
    } else {
      const r = await fetch(`${clientBase}/api/groupPostLikes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post: postId }),
        credentials: 'include',
      })
      const b = (await r.json().catch(() => ({}))) as { doc?: { id: number } }
      if (r.ok && b.doc?.id) {
        setMyPostLikeId((m) => ({ ...m, [k]: b.doc!.id }))
        setLikeByPost((L) => ({ ...L, [k]: (L[k] || 0) + 1 }))
      }
    }
  }

  const deletePost = async (postId: number) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this post? This cannot be undone.')) {
      return
    }
    const r = await fetch(`${clientBase}/api/groupPosts/${postId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (r.ok) {
      setPosts((all) => all.filter((x) => x.id !== postId))
      setMessage(null)
    } else {
      setMessage('Could not delete post')
    }
  }

  const copyPostLink = (postId: number) => {
    const path = `${clientBase || ''}/groups/${group.slug}#post-${postId}`
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(path)
      setMessage('Link to post copied')
    }
  }

  const sharePost = (p: GroupPost) => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/groups/${group.slug}` : ''
    const t = p.text.length > 160 ? `${p.text.slice(0, 157)}…` : p.text
    if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (d: ShareData) => void }).share) {
      void (navigator as Navigator & { share: (d: ShareData) => Promise<void> })
        .share({ title: group.name, text: t, url })
        .catch(() => {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            void navigator.clipboard.writeText(`${url}#post-${p.id}`)
            setMessage('Link copied')
          }
        })
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(`${url}#post-${p.id}`)
      setMessage('Link copied')
    }
  }

  const addComment = async (postId: number) => {
    const t = (commentDraft[String(postId)] || '').trim()
    if (!t || !me) return
    const post = posts.find((x) => x.id === postId)
    if (post?.commentsEnabled === false) return
    if (!isMember) {
      setMessage('Join the group to comment')
      return
    }
    const r = await fetch(`${clientBase}/api/groupComments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post: postId, text: t, author: me.id }),
      credentials: 'include',
    })
    const b = (await r.json().catch(() => ({}))) as { doc?: GroupComment }
    if (r.ok && b.doc) {
      const k = String(postId)
      setCommentsByPost((c) => ({ ...c, [k]: [...(c[k] || []), b.doc as GroupComment] }))
      setCommentDraft((d) => ({ ...d, [k]: '' }))
    }
  }

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!me || !isAdmin) return
    setInvitePending(true)
    const r = await fetch(`${clientBase}/api/groupInvites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group: group.id, email: inviteEmail, message: inviteMessage }),
      credentials: 'include',
    })
    if (r.ok) {
      setMessage('Invite sent (pending)')
      setInviteEmail('')
      setInviteMessage('')
    } else {
      setMessage('Could not send invite')
    }
    setInvitePending(false)
  }

  return (
    <div className="min-h-screen pb-20">
      <div
        className="relative h-40 w-full bg-gradient-to-b from-slate-800 to-slate-600 md:h-56"
        style={coverSrc ? { backgroundImage: `url(${coverSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      />
      <div className="container -mt-12 relative z-10 max-w-3xl">
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{group.name}</h1>
          {group.shortDescription && <p className="text-muted-foreground mt-2 text-sm md:text-base">{group.shortDescription}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!isMember && (
              <Button onClick={join} size="sm" type="button" variant="default">
                <UserPlus className="size-4" />
                Join
              </Button>
            )}
            {isMember && (
              <span className="text-sm text-muted-foreground">You are a member</span>
            )}
            <Button onClick={onShare} size="sm" type="button" variant="secondary">
              <Copy className="size-4" />
              Copy link
            </Button>
            {typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (d: ShareData) => void }).share && (
              <Button
                className="gap-1.5"
                onClick={async () => {
                  const url = window.location.href
                  try {
                    await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ title: group.name, text: group.shortDescription || group.name, url })
                  } catch {
                    // ignore
                  }
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                <Share2 className="size-4" />
                Share
              </Button>
            )}
            {me && (
              <span className="ml-auto text-right text-xs text-muted-foreground">
                Signed in as {getUserDisplayName(me)}
                {me.role && <span className="block">Role: {me.role}</span>}
              </span>
            )}
            {!me && (
              <Link className="ml-auto text-sm text-primary underline" href={signInUrl}>
                Sign in
              </Link>
            )}
          </div>
          {message && <p className="text-muted-foreground mt-2 text-sm">{message}</p>}
        </div>

        <div className="no-scrollbar mt-4 flex overflow-x-auto gap-1 border-b border-border/80 pb-px text-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={cn(
                'shrink-0 rounded-t-lg px-3 py-2 font-medium transition',
                tab === t.id
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60',
              )}
              onClick={() => {
                setTab(t.id)
                if (t.id === 'questions') {
                  // filter handled by filteredPosts; composer adds question
                }
              }}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'about' && (
          <div className="prose dark:prose-invert py-6">
            {group.about ? <RichText data={group.about} enableGutter={false} /> : <p className="text-muted-foreground">No about text yet.</p>}
          </div>
        )}

        {tab === 'members' && (
          <ul className="mt-4 space-y-2">
            {members.map((m) => (
              <li
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                key={m.id}
              >
                <span>{userLabel(m.user)}</span>
                <span className="text-muted-foreground text-xs uppercase">{m.role}</span>
              </li>
            ))}
          </ul>
        )}

        {tab === 'events' && (
          <ul className="mt-4 space-y-3">
            {initialEvents.length === 0 && <p className="text-muted-foreground text-sm">No events — admins and moderators can add events in the admin.</p>}
            {initialEvents.map((ev) => (
              <li
                className="rounded-lg border border-border/60 p-3 text-sm"
                key={ev.id}
              >
                <p className="font-medium">{ev.title}</p>
                {ev.location && <p className="text-muted-foreground">{ev.location}</p>}
                <p className="text-muted-foreground mt-1 text-xs">
                  {new Date(ev.startsAt).toLocaleString()} {ev.endsAt && ` – ${new Date(ev.endsAt).toLocaleString()}`}
                </p>
                {ev.description && <p className="mt-1">{ev.description}</p>}
              </li>
            ))}
          </ul>
        )}

        {tab === 'media' && (
          <div className="mt-4 grid grid-cols-2 gap-1 sm:grid-cols-3">
            {allMedia.length === 0 && <p className="text-muted-foreground col-span-full text-sm">No images yet. Add photos to a post.</p>}
            {allMedia.map((m) => (
              <a
                className="aspect-square overflow-hidden bg-muted"
                href={m.url || mediaUrl(m, serverBase)}
                key={m.id}
                rel="noreferrer"
                target="_blank"
              >
                <img
                  alt={m.alt || 'photo'}
                  className="h-full w-full object-cover"
                  src={mediaUrl(m, serverBase)}
                />
              </a>
            ))}
          </div>
        )}

        {tab === 'invite' && (
          <div className="mt-6 max-w-md">
            {!isAdmin && (
              <p className="text-muted-foreground text-sm">Only moderators and admins can invite by email.</p>
            )}
            {isAdmin && (
              <form className="space-y-3" onSubmit={sendInvite}>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    onChange={(e) => setInviteEmail(e.target.value)}
                    type="email"
                    value={inviteEmail}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Message (optional)</Label>
                  <Textarea onChange={(e) => setInviteMessage(e.target.value)} value={inviteMessage} rows={3} />
                </div>
                <Button disabled={invitePending} type="submit">
                  {invitePending ? 'Sending…' : 'Send invite'}
                </Button>
              </form>
            )}
          </div>
        )}

        {(tab === 'discussion' || tab === 'questions') && (
          <div className="mt-6">
            <GroupFeedCreatePost
              canPost={Boolean(me && isMember)}
              onOpenPost={openPostComposer}
              onStubCheckIn={stubGroupFeature}
              onStubFeeling={stubGroupFeature}
              onStubPoll={stubGroupFeature}
              userLabel={userDisplayName}
              writePlaceholder={
                tab === 'questions' ? 'Ask the group something…' : 'Write something…'
              }
            />

            {composerOpen && me && isMember && (
              <div
                className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
                onClick={() => setComposerOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setComposerOpen(false)
                }}
                role="presentation"
              >
                <div
                  className="w-full max-h-[90dvh] overflow-y-auto rounded-t-2xl border border-border/80 bg-card p-4 shadow-2xl sm:max-w-lg sm:rounded-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">
                      {tab === 'questions' ? 'Ask a question' : 'Create post'}
                    </h2>
                    <Button
                      aria-label="Close"
                      className="size-8 shrink-0 p-0"
                      onClick={() => setComposerOpen(false)}
                      type="button"
                      variant="ghost"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                  <form className="space-y-3" onSubmit={createPost}>
                    {tab === 'questions' && (
                      <p className="text-muted-foreground text-xs">This will be posted as an open question</p>
                    )}
                    <Textarea
                      onChange={(e) => setComposerText(e.target.value)}
                      placeholder={
                        tab === 'questions'
                          ? 'What do you want to ask the group?'
                          : 'Write something to the group…'
                      }
                      value={composerText}
                      required
                    />
                    {tab === 'discussion' && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Type: </span>
                        {(['discussion', 'announcement'] as const).map((pt) => (
                          <label className="ml-2" key={pt}>
                            <input
                              checked={postType === pt}
                              onChange={() => setPostType(pt)}
                              type="radio"
                            />{' '}
                            {pt}
                          </label>
                        ))}
                      </div>
                    )}
                    <div>
                      <input
                        accept="image/*"
                        multiple
                        onChange={(e) => setFiles(e.target.files)}
                        type="file"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={commentsEnabled}
                        id="allow-comments-modal"
                        onCheckedChange={(c) => setCommentsEnabled(c === true)}
                      />
                      <Label
                        className="cursor-pointer font-normal"
                        htmlFor="allow-comments-modal"
                      >
                        Allow comments on this post
                      </Label>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      <Button
                        onClick={() => setComposerOpen(false)}
                        type="button"
                        variant="ghost"
                      >
                        Cancel
                      </Button>
                      <Button disabled={pendingPost} type="submit" variant="secondary">
                        {tab === 'questions' ? 'Post question' : 'Post'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="space-y-4 sm:space-y-5">
              {filteredPosts.map((p) => {
                const pk = String(p.id)
                const n = likeByPost[pk] || 0
                const canComment = p.commentsEnabled !== false
                const isAuthor = Boolean(me && relAuthor(p.author) === String(me.id))
                return (
                  <div id={`post-${p.id}`} key={p.id}>
                    <GroupPostCard
                      answerPlaceholder={tab === 'questions'}
                      canComment={canComment}
                      canDelete={isAuthor || isAdmin}
                      commentDraft={commentDraft[pk] || ''}
                      comments={commentsByPost[pk] || []}
                      hasLiked={Boolean(myPostLikeId[pk])}
                      isMember={isMember}
                      likeCount={n}
                      me={me}
                      mediaBase={clientBase || serverBase}
                      onComment={() => addComment(p.id)}
                      onCommentDraft={(v) => setCommentDraft((d) => ({ ...d, [pk]: v }))}
                      onCopyLink={() => copyPostLink(p.id)}
                      onDelete={isAuthor || isAdmin ? () => void deletePost(p.id) : undefined}
                      onLike={() => void toggleLike(p.id)}
                      onShare={() => sharePost(p)}
                      post={p}
                    />
                  </div>
                )
              })}
              {filteredPosts.length === 0 && <p className="text-muted-foreground text-sm">No posts in this view yet.</p>}
            </div>
          </div>
        )}

        {!isMember && (tab === 'discussion' || tab === 'questions') && (
          <p className="text-muted-foreground py-2 text-sm">Join the group to create posts, comment, and like.</p>
        )}
      </div>
    </div>
  )
}
