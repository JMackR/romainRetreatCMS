import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import { cache } from 'react'

import { Button } from '@/components/ui/button'
import { getServerSideURL } from '@/utilities/getURL'
import type { Group, Media } from '@/payload-types'

import { getMeUserOptional } from '@/utilities/getMeUserOptional'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Groups',
  description: 'Community groups — discussions, events, and media.',
}

const listGroups = cache(async () => {
  const payload = await getPayload({ config: configPromise })
  return payload.find({
    collection: 'groups',
    limit: 100,
    sort: 'name',
    overrideAccess: true,
    depth: 1,
  })
})

function coverImageUrl(cover: Group['cover']): string | null {
  if (cover == null) return null
  if (typeof cover === 'object' && (cover as Media).url) {
    const u = (cover as Media).url
    if (u == null) return null
    return u
  }
  return null
}

export default async function GroupsIndex() {
  const { docs } = await listGroups()
  const me = await getMeUserOptional()

  return (
    <div className="container max-w-4xl py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Groups</h1>
          <p className="text-muted-foreground mt-1 max-w-lg text-sm">
            Public and private community spaces. Join to post, ask questions, share photos, and see
            events.
          </p>
        </div>
        {me ? (
          <Button asChild>
            <a href="/groups/new">Create group</a>
          </Button>
        ) : (
          <Button asChild variant="secondary">
            <a href="/login?next=%2Fgroups%2Fnew">Sign in to create</a>
          </Button>
        )}
      </div>
      <ul className="mt-10 space-y-4">
        {docs.length === 0 && (
          <p className="text-muted-foreground">No groups yet. Create the first one.</p>
        )}
        {(docs as Group[]).map((g) => {
          const img = coverImageUrl(g.cover)
          return (
            <li key={g.id}>
              <Link
                className="group flex gap-4 overflow-hidden rounded-xl border border-border/80 bg-card p-4 transition hover:border-border"
                href={`/groups/${g.slug}`}
              >
                <div className="h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                  {img ? (
                    <img
                      src={img.startsWith('http') ? img : `${getServerSideURL()}${img.startsWith('/') ? '' : '/'}${img}`}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      no cover
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-medium group-hover:underline">{g.name}</h2>
                  {g.shortDescription && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{g.shortDescription}</p>
                  )}
                  <p className="mt-1 text-xs capitalize text-muted-foreground">{g.privacy} group</p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
