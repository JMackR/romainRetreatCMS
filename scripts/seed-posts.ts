/**
 * Seeds published demo posts (idempotent by slug).
 * If SQLite errors with "index ... already exists", stop the CMS dev server and run again.
 */
import 'dotenv/config'

import { buildDefaultEditorState } from '@payloadcms/richtext-lexical'
import { getPayload } from 'payload'

import config from '../src/payload.config'

const seeds = [
  {
    slug: 'welcome-to-romain-retreat',
    title: 'Welcome to Romain Retreat',
    excerpt:
      'A sample post created by the seed script. Open the feed on the Next.js site to see pagination in action.',
    body: `This is the full post body.

You can edit this post in the Payload admin under **Posts**, or add more posts to fill additional pages of the feed.

The web app loads these entries over GraphQL with page-based pagination.`,
  },
  {
    slug: 'demo-post-2',
    title: 'Demo post 2 — pagination',
    excerpt: 'Short excerpt for the second seeded post.',
    body: 'Body text for demo post 2. Add your own collections and fields in Payload as the project grows.',
  },
  {
    slug: 'demo-post-3',
    title: 'Demo post 3 — pagination',
    excerpt: 'Another card on the first or second page of the feed.',
    body: 'Body text for demo post 3.',
  },
  {
    slug: 'demo-post-4',
    title: 'Demo post 4 — pagination',
    excerpt: 'Keeps the feed populated for local development.',
    body: 'Body text for demo post 4.',
  },
  {
    slug: 'demo-post-5',
    title: 'Demo post 5 — pagination',
    excerpt: 'Five posts per page → this helps fill page 1.',
    body: 'Body text for demo post 5.',
  },
  {
    slug: 'demo-post-6',
    title: 'Demo post 6 — second page',
    excerpt: 'With default page size of 5, this post appears on page 2.',
    body: 'Body text for demo post 6. Try the Next / Previous controls on the feed.',
  },
] as const

async function main() {
  const payload = await getPayload({ config })
  const now = new Date().toISOString()
  let created = 0

  for (const item of seeds) {
    const existing = await payload.find({
      collection: 'posts',
      where: { slug: { equals: item.slug } },
      limit: 1,
    })
    if (existing.docs.length > 0) continue

    await payload.create({
      collection: 'posts',
      data: {
        title: item.title,
        slug: item.slug,
        excerpt: item.excerpt,
        body: buildDefaultEditorState({ text: item.body }),
        published: true,
        publishedAt: now,
      },
    })
    created += 1
  }

  if (created === 0) {
    console.log('All seed posts already exist — nothing to do.')
  } else {
    console.log(`Created ${created} published post(s). Open http://localhost:3000/posts`)
  }
  process.exit(0)
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
