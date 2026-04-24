import { PostsFromApollo } from '@/components/PostsFromApollo'
import type { NextPage } from 'next'
import React from 'react'

/**
 * Romain stack demo: GraphQL on romainRetreatServer via same-origin rewrites (Apollo + `/api/retreat-graphql`).
 */
const Page: NextPage = () => {
  return (
    <div className="container max-w-2xl space-y-4 py-10">
      <h1 className="text-4xl font-bold">Romain Retreat — Apollo + GraphQL</h1>
      <p className="text-muted-foreground text-sm">
        Apollo points at <code className="rounded bg-muted px-1">/api/retreat-graphql</code> (Next rewrite →
        <code className="rounded bg-muted px-1">romainRetreatServer</code>), or{' '}
        <code className="rounded bg-muted px-1">NEXT_PUBLIC_ROMAIN_RETREAT_GRAPHQL_URL</code> if set. Documents live
        in <code className="rounded bg-muted px-1">src/lib/apollo/documents</code>.
      </p>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Posts (public GraphQL)</h2>
        <PostsFromApollo />
      </section>
    </div>
  )
}

export default Page
