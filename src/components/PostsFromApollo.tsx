'use client'

import { useQuery } from '@apollo/client'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from 'lexical'

import { PostsListDocument, type PostListItem, type PostsListData } from '@/lib/apollo/documents'

/**
 * Example: load posts from **romainRetreatServer** (via same-origin `/api/retreat-graphql` by default).
 * See `src/lib/apollo/env.ts` and `next.config.mjs` rewrites.
 */
export function PostsFromApollo() {
  const { data, loading, error } = useQuery<PostsListData>(PostsListDocument, {
    errorPolicy: 'all',
  })

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading posts (GraphQL via retreat server)…</p>
  }
  if (error) {
    return (
      <p className="text-destructive text-sm" role="alert">
        GraphQL: {error.message}
      </p>
    )
  }

  const docs: PostListItem[] = data?.Posts?.docs ?? []
  if (docs.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No posts yet, or the server has no public read on `posts`. Run <code className="rounded bg-muted px-1">yarn seed:posts</code> in the CMS to add samples.</p>
    )
  }

  return (
    <ul className="space-y-4 text-sm">
      {docs.map((p) => (
        <li key={p.id} className="list-none rounded-md border border-border p-3">
          <p className="font-medium">{p.title ?? p.id}</p>
          {p.content != null && isLexicalState(p.content) ? (
            <div className="text-muted-foreground [&_a]:text-primary mt-2 leading-relaxed [&_a]:underline">
              <RichText data={p.content} />
            </div>
          ) : p.content != null && typeof p.content === 'string' ? (
            <p className="text-muted-foreground mt-2 whitespace-pre-wrap leading-relaxed">{p.content}</p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function isLexicalState(v: unknown): v is SerializedEditorState {
  return (
    typeof v === 'object' &&
    v !== null &&
    'root' in v &&
    typeof (v as { root?: unknown }).root === 'object' &&
    (v as { root: unknown }).root !== null
  )
}
