# Romain Retreat CMS (Payload 3)

Payload admin and Next.js app. This project intentionally keeps a **fixed stack**; when pulling in features from the [official `website` template](https://github.com/payloadcms/payload/tree/3.x/templates/website), **only port the pieces you need**—do not replace these foundations:

| Layer | What we use | Do not switch to |
|--------|-------------|------------------|
| **Database** | `@payloadcms/db-postgres` + `DATABASE_URL` (Postgres), `PAYLOAD_DATABASE_PUSH` for Drizzle push | MongoDB / `mongooseAdapter` (the upstream template defaults to Mongo) |
| **API (public)** | Payload **GraphQL** at `/api/graphql` and the shared schema with `romainRetreatServer` | Dropping GraphQL in favor of REST-only |
| **Client (this app)** | **Apollo Client** — `src/lib/apollo/`, `ApolloProvider`, rewrites in `next.config.mjs` | Removing Apollo for template-only `fetch` patterns (you can add both, but keep Apollo for retreat-graphql) |
| **Styling** | **Tailwind CSS 4** + **shadcn-style** components (`components.json`, `src/components/ui/`) | Replacing with a different design system from the template wholesale |

`sharp` and `@payloadcms/richtext-lexical` (Lexical) are aligned with normal Payload 3 usage.

## Quick start

1. `cp .env.example .env` and set `PAYLOAD_SECRET`, `DATABASE_URL` (Postgres, e.g. from `romainRetreatServer`’s `yarn db:start` + the URL in `.env.example`).

2. `PAYLOAD_DATABASE_PUSH=1` on a **new** database until the schema exists; then use `0` in steady state.

3. `yarn dev` (optionally `yarn dev -p 3001` if port 3000 is taken).

4. Admin: `/admin` — the `(app)` route in `src/app/(app)/` is the in-app demo (Apollo + GraphQL).

5. **GraphQL in dev with the standalone server**: set rewrites in `next.config.mjs` and `ROMAIN_RETREAT_SERVER_URL` as in `.env.example` so `/api/retreat-graphql` proxies to `romainRetreatServer`.

## Original shadcn tutorial

The repo started from Payload’s Tailwind + shadcn example. See [Payload: Tailwind and shadcn in the admin](https://payloadcms.com/blog/how-to-setup-tailwindcss-and-shadcn-ui-in-payload) for the general idea. Our stack and env have evolved (Postgres, Apollo, retreat GraphQL) as above.

## Development

Changes under `src/` are picked up on save. Regenerate types after schema changes: `yarn generate:types`. Seed sample posts: `yarn seed:posts` (empty `posts` collection only).
