/**
 * Insert sample `posts` when the DB is empty. Requires `DATABASE_URL` and `PAYLOAD_SECRET` in `.env`.
 * Run: `yarn seed:posts` from `romainRetreatCMS`
 */
import 'dotenv/config'

import { getPayload } from 'payload'
import type { Config } from 'payload'

import config from '../src/payload.config.js'

/** Minimal Lexical serialized state for a single paragraph (matches default Lexical + Payload richtext). */
function lexicalFromPlainText(text: string) {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          textFormat: 0,
          textStyle: '',
          version: 1,
          children: [
            {
              type: 'text',
              detail: 0,
              format: 0,
              mode: 'normal' as const,
              style: '',
              text,
              version: 1,
            },
          ],
          direction: 'ltr' as const,
        },
      ],
      direction: 'ltr' as const,
    },
  }
}

const SAMPLES: { title: string; slug: string; body: string }[] = [
  {
    title: 'Lorem ipsum: opening',
    slug: 'lorem-ipsum-opening',
    body:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  },
  {
    title: 'Duis aute: second sample',
    slug: 'duis-aute-second-sample',
    body:
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.',
  },
]

async function main() {
  if (!process.env.DATABASE_URL || !process.env.PAYLOAD_SECRET) {
    console.error('Set DATABASE_URL and PAYLOAD_SECRET in .env (same as for `yarn dev`).')
    process.exit(1)
  }

  const cfg = (await Promise.resolve(
    config,
  )) as Config
  const payload = await getPayload({ config: cfg })

  const { totalDocs } = await payload.count({ collection: 'posts', overrideAccess: true })
  if (totalDocs > 0) {
    console.log(`Skip: already ${totalDocs} post(s) in the database. Delete them or clear the collection to re-seed.`)
    process.exit(0)
  }

  for (const row of SAMPLES) {
    await payload.create({
      collection: 'posts',
      data: {
        title: row.title,
        slug: row.slug,
        content: lexicalFromPlainText(row.body),
        _status: 'published',
      },
      overrideAccess: true,
    })
    console.log('Created post:', row.title)
  }
  console.log('Done.')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
