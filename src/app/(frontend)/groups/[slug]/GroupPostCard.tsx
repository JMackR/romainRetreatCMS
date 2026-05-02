'use client'

import { useCallback, useId, useRef } from 'react'
import {
  AtSign,
  Copy,
  Globe,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  Smile,
  ThumbsUp,
  Trash2,
} from 'lucide-react'

import { getUserDisplayName } from '@/utilities/userDisplayName'

import { Button } from '@/components/ui/button'
import type { GroupPost, User, Media, GroupComment } from '@/payload-types'

import { cn } from '@/utilities/ui'

function relAuthor(a: GroupPost['author']): string {
  if (a == null) return ''
  if (typeof a === 'object' && 'id' in a) return String(a.id)
  return String(a)
}

export function userInitials(authorName: string | null | undefined): string {
  const s = (authorName || 'Member').trim()
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  }
  return s.slice(0, 2).toUpperCase() || '?'
}

export function formatPostRelativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  if (s < 2592000) return `${Math.floor(s / 604800)}w`
  return new Date(iso).toLocaleDateString()
}

type GroupPostCardProps = {
  post: GroupPost
  likeCount: number
  hasLiked: boolean
  canComment: boolean
  comments: GroupComment[]
  commentDraft: string
  onCommentDraft: (v: string) => void
  onLike: () => void
  onComment: () => void
  onShare: () => void
  onCopyLink: () => void
  onDelete?: () => void
  canDelete: boolean
  me: User | null
  isMember: boolean
  mediaBase: string
  answerPlaceholder: boolean
}

export function GroupPostCard({
  post: p,
  likeCount: n,
  hasLiked,
  canComment,
  comments,
  commentDraft,
  onCommentDraft,
  onLike,
  onComment,
  onShare,
  onCopyLink,
  onDelete,
  canDelete,
  me,
  isMember,
  mediaBase,
  answerPlaceholder,
}: GroupPostCardProps) {
  const commentInputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const pk = String(p.id)

  const focusComment = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onComment()
    }
  }

  const placeholder = answerPlaceholder
    ? 'Write an answer…'
    : p.postType === 'question'
      ? 'Write an answer…'
      : 'Write a comment…'

  return (
    <article
      className={cn(
        'overflow-hidden rounded-xl border border-border/50 bg-card text-[15px] leading-snug',
        'shadow-sm ring-1 ring-border/20 dark:ring-border/40',
      )}
    >
      <div className="p-3 sm:p-4">
        <header className="flex gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/70 text-sm font-semibold text-muted-foreground"
            aria-hidden
          >
            {userInitials(p.authorName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {p.authorName || 'Member'}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                  {p.postType === 'question' && (
                    <span className="inline-flex max-w-full items-center rounded-full bg-muted px-2 py-0.5 font-medium text-foreground/80">
                      Open question
                    </span>
                  )}
                  {p.postType === 'announcement' && (
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium text-foreground/80">
                      Announcement
                    </span>
                  )}
                  {(p.postType === 'question' || p.postType === 'announcement') && (
                    <span className="text-muted-foreground/70" aria-hidden>
                      ·
                    </span>
                  )}
                  <span title={new Date(p.createdAt).toLocaleString()}>
                    {formatPostRelativeTime(p.createdAt)}
                  </span>
                  <span className="text-muted-foreground/50" aria-hidden>
                    ·
                  </span>
                  <span className="inline-flex items-center gap-0.5" title="Group">
                    <Globe className="size-3.5 opacity-70" aria-hidden />
                    <span className="sr-only">Group post</span>
                  </span>
                </p>
              </div>
              <details className="relative shrink-0" id={`post-menu-${p.id}`}>
                <summary
                  className="list-none cursor-pointer rounded-full p-1.5 text-muted-foreground transition hover:bg-muted [&::-webkit-details-marker]:hidden"
                  aria-label="Post options"
                >
                  <MoreHorizontal className="size-5" />
                </summary>
                <ul
                  className="absolute right-0 z-20 mt-0.5 min-w-[11rem] rounded-lg border border-border/80 bg-popover py-1 text-sm text-popover-foreground shadow-md"
                  role="menu"
                >
                  <li>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        onCopyLink()
                        const el = document.getElementById(
                          `post-menu-${p.id}`,
                        ) as HTMLDetailsElement | null
                        if (el) el.open = false
                      }}
                      role="menuitem"
                      type="button"
                    >
                      <Copy className="size-4" />
                      Copy link
                    </button>
                  </li>
                  <li>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        onShare()
                        const el = document.getElementById(
                          `post-menu-${p.id}`,
                        ) as HTMLDetailsElement | null
                        if (el) el.open = false
                      }}
                      role="menuitem"
                      type="button"
                    >
                      <Share2 className="size-4" />
                      Share
                    </button>
                  </li>
                  {canDelete && onDelete && (
                    <li>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          onDelete()
                          const el = document.getElementById(
                            `post-menu-${p.id}`,
                          ) as HTMLDetailsElement | null
                          if (el) el.open = false
                        }}
                        role="menuitem"
                        type="button"
                      >
                        <Trash2 className="size-4" />
                        Delete post
                      </button>
                    </li>
                  )}
                </ul>
              </details>
            </div>
          </div>
        </header>

        <div className="mt-2 sm:mt-3">
          <p className="whitespace-pre-wrap break-words text-foreground/95 [text-rendering:optimizeLegibility]">
            {p.text}
          </p>
          {p.photos && p.photos.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {p.photos.map((ph) => {
                const m = typeof ph === 'object' ? (ph as Media) : null
                if (!m) return null
                const path = m.url
                  ? m.url.startsWith('http')
                    ? m.url
                    : `${mediaBase}${m.url.startsWith('/') ? '' : '/'}${m.url}`
                  : ''
                if (!path) return null
                return (
                  <a
                    className="block overflow-hidden rounded-lg bg-muted"
                    href={path}
                    key={m.id}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <img alt={m.alt || ''} className="max-h-80 w-full object-cover" src={path} />
                  </a>
                )
              })}
            </div>
          )}
        </div>

        {n > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {n} {n === 1 ? 'like' : 'likes'}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 border-t border-border/50">
        <button
          className={cn(
            'flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition',
            hasLiked
              ? 'text-primary'
              : 'text-muted-foreground hover:bg-muted/60',
          )}
          onClick={() => void onLike()}
          type="button"
        >
          <ThumbsUp className="size-5" strokeWidth={hasLiked ? 2.5 : 1.8} />
          <span>Like</span>
        </button>
        <button
          className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted/60"
          onClick={focusComment}
          type="button"
        >
          <MessageCircle className="size-5" />
          <span>Comment</span>
        </button>
        <button
          className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted/60"
          onClick={onShare}
          type="button"
        >
          <Send className="size-5" />
          <span>Send</span>
        </button>
      </div>

      {comments.length > 0 && (
        <ul className="space-y-2.5 border-t border-border/50 bg-muted/20 px-3 py-3 sm:px-4">
          {comments.map((c) => (
            <li className="flex gap-2 text-sm" key={c.id}>
              <div
                className="mt-0.5 flex h-7 w-7 flex-shrink-0 select-none items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground"
                aria-hidden
              >
                {userInitials(c.authorName)}
              </div>
              <div>
                <span className="font-semibold text-foreground/90">
                  {c.authorName}
                </span>
                <span className="text-foreground/90"> {c.text}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isMember && canComment && (
        <div className="border-t border-border/50 bg-card px-2 py-2.5 sm:px-3">
          <div className="flex items-end gap-2 sm:items-center">
            <div
              className="mb-0.5 flex h-7 w-7 flex-shrink-0 select-none items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground sm:mb-0"
              aria-hidden
            >
              {me ? userInitials(getUserDisplayName(me)) : '…'}
            </div>
            <div className="relative min-w-0 flex-1">
              <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/30 py-0.5 pl-3 pr-1 dark:bg-muted/20">
                <label className="sr-only" htmlFor={commentInputId + pk}>
                  {placeholder}
                </label>
                <input
                  className="h-8 min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground/70"
                  id={commentInputId + pk}
                  onChange={(e) => onCommentDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  onMouseDown={focusComment}
                  ref={inputRef}
                  value={commentDraft}
                  type="text"
                  placeholder={placeholder}
                />
                <span className="hidden h-5 border-l border-border/60 sm:inline" aria-hidden />
                <div className="hidden flex-shrink-0 items-center gap-0.5 pr-0.5 sm:flex">
                  <span className="p-1 text-muted-foreground" title="Mention (coming soon)">
                    <AtSign className="size-4 opacity-50" />
                  </span>
                  <span className="p-1 text-muted-foreground" title="Emoji (coming soon)">
                    <Smile className="size-4 opacity-50" />
                  </span>
                  <span className="p-1 text-muted-foreground" title="Photo (use group post)">
                    <ImageIcon className="size-4 opacity-50" />
                  </span>
                </div>
              </div>
            </div>
            <Button
              className="h-8 shrink-0"
              onClick={onComment}
              size="sm"
              type="button"
              variant="secondary"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {isMember && !canComment && (
        <p className="border-t border-border/50 px-3 py-2.5 text-center text-xs text-muted-foreground">
          Comments are turned off for this post.
        </p>
      )}
    </article>
  )
}

export { relAuthor }
