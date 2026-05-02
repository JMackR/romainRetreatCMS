'use client'

import { BarChart3, MapPin, Smile, User } from 'lucide-react'

import { userInitials } from './GroupPostCard'

import { cn } from '@/utilities/ui'

const palette = {
  feeling: 'text-[#D4A00A]',
  checkin: 'text-[#E11D48]',
  poll: 'text-[#EA580C]',
}

type GroupFeedCreatePostProps = {
  /** If false, softens the card; clicks still go to the parent (e.g. sign in / join) */
  canPost: boolean
  onOpenPost: () => void
  onStubFeeling: () => void
  onStubCheckIn: () => void
  onStubPoll: () => void
  /** e.g. user name for initials; falls back to silhouette */
  userLabel: string | null
  /** Text inside the pill (e.g. "Ask something…" on the questions tab) */
  writePlaceholder?: string
}

export function GroupFeedCreatePost({
  canPost,
  onOpenPost,
  onStubFeeling,
  onStubCheckIn,
  onStubPoll,
  userLabel,
  writePlaceholder = 'Write something…',
}: GroupFeedCreatePostProps) {
  return (
    <div
      className={cn(
        'mb-4 overflow-hidden rounded-2xl border border-border/60 bg-card text-left shadow-sm ring-1 ring-border/15',
        'dark:ring-border/30',
        !canPost && 'opacity-80',
      )}
    >
      <div className="flex min-h-[52px] items-center gap-2.5 px-3 py-2.5 sm:px-4 sm:py-3">
        <div
          aria-hidden
          className={cn(
            'flex h-10 w-10 flex-shrink-0 select-none items-center justify-center rounded-full text-sm font-semibold',
            userLabel
              ? 'bg-gradient-to-br from-muted to-muted/70 text-muted-foreground'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {userLabel ? userInitials(userLabel) : <User className="h-5 w-5" strokeWidth={1.5} />}
        </div>
        <button
          className={cn(
            'h-9 min-h-0 flex-1 cursor-pointer rounded-full border-0 bg-[#F0F2F5] px-4 text-left text-sm text-muted-foreground transition',
            'hover:bg-[#E4E6E9] dark:bg-muted/60 dark:hover:bg-muted/50',
          )}
          onClick={onOpenPost}
          type="button"
        >
          {writePlaceholder}
        </button>
      </div>
      <div className="h-px w-full bg-border/80" role="separator" />
      <div className="grid grid-cols-3 gap-0 divide-x divide-border/50">
        <button
          className="flex min-h-11 items-center justify-center gap-1.5 py-1.5 text-sm font-medium text-foreground/85 transition hover:bg-muted/50 sm:min-h-12"
          onClick={onStubFeeling}
          type="button"
        >
          <Smile className={cn('size-5 shrink-0', palette.feeling)} strokeWidth={1.8} />
          <span className="hidden min-[400px]:inline">Feeling/activity</span>
          <span className="min-[400px]:hidden">Feeling</span>
        </button>
        <button
          className="flex min-h-11 items-center justify-center gap-1.5 py-1.5 text-sm font-medium text-foreground/85 transition hover:bg-muted/50 sm:min-h-12"
          onClick={onStubCheckIn}
          type="button"
        >
          <MapPin className={cn('size-5 shrink-0', palette.checkin)} strokeWidth={1.8} />
          <span>Check in</span>
        </button>
        <button
          className="flex min-h-11 items-center justify-center gap-1.5 py-1.5 text-sm font-medium text-foreground/85 transition hover:bg-muted/50 sm:min-h-12"
          onClick={onStubPoll}
          type="button"
        >
          <BarChart3 className={cn('size-5 shrink-0', palette.poll)} strokeWidth={1.8} />
          <span>Poll</span>
        </button>
      </div>
    </div>
  )
}
