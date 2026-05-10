# Romain Retreat CMS (Payload 3)

Payload admin and Next.js app. This project intentionally keeps a **fixed stack**; when pulling in features from the [official `website` template](https://github.com/payloadcms/payload/tree/3.x/templates/website), **only port the pieces you need**—do not replace these foundations:

> **Vercel (Git push → deploy):** Import `romainRetreatCMS` in the Vercel dashboard and connect your Git repo; builds use [`vercel.json`](./vercel.json). Env vars and backend wiring: [`../romainRetreatServer/DEPLOYMENT.md`](../romainRetreatServer/DEPLOYMENT.md) §8 (Vercel — CMS / Next.js).
>
> **Deploying on AWS?** CI: [`buildspec.yml`](./buildspec.yml) + [`docs/aws-codepipeline-github.md`](./docs/aws-codepipeline-github.md). Run the CMS container behind an ALB and Route 53: [`docs/aws-cms-hosting.md`](./docs/aws-cms-hosting.md). Backend/Aurora/federation context still lives in [`../romainRetreatServer/DEPLOYMENT.md`](../romainRetreatServer/DEPLOYMENT.md) (server-focused; align CMS `DATABASE_URL` / `ROMAIN_RETREAT_SERVER_*` with that stack).
>
> **AWS + Bitbucket → Amplify Hosting:** [`amplify.yml`](./amplify.yml) + [`docs/aws-bitbucket-amplify.md`](./docs/aws-bitbucket-amplify.md).
>
> **AWS + GitHub → CodePipeline + CodeBuild:** [`buildspec.yml`](./buildspec.yml) + [`aws/codepipeline-github.yaml`](./aws/codepipeline-github.yaml) + [`docs/aws-codepipeline-github.md`](./docs/aws-codepipeline-github.md).

| Layer | What we use | Do not switch to |
|--------|-------------|------------------|
| **Database** | `@payloadcms/db-postgres` + `DATABASE_URL` (Postgres), `PAYLOAD_DATABASE_PUSH` for Drizzle push | MongoDB / `mongooseAdapter` (the upstream template defaults to Mongo) |
| **API (public)** | Payload **GraphQL** at `/api/graphql` and the shared schema with `romainRetreatServer` | Dropping GraphQL in favor of REST-only |
| **Client (this app)** | **Apollo Client** — `src/lib/apollo/`, `ApolloProvider`, rewrites in `next.config.mjs` | Removing Apollo for template-only `fetch` patterns (you can add both, but keep Apollo for retreat-graphql) |
| **Styling** | **Tailwind CSS 4** + **shadcn-style** components (`components.json`, `src/components/ui/`) | Replacing with a different design system from the template wholesale |

`sharp` and `@payloadcms/richtext-lexical` (Lexical) are aligned with normal Payload 3 usage.

## Quick start

1. Env: either `cp .env.local.example .env.local` or `cp .env.example .env`, then set `PAYLOAD_SECRET`, `DATABASE_URL` (Postgres, e.g. from `romainRetreatServer`’s `yarn db:start`). Committed defaults live in `.env.development` / `.env.production`; secrets stay in `.env.local` (or `.env`).

2. `PAYLOAD_DATABASE_PUSH=1` on a **new** database until the schema exists; then use `0` in steady state.

3. `yarn dev` (optionally `yarn dev -p 3001` if port 3000 is taken).

4. Admin: `/admin` — the `(app)` route in `src/app/(app)/` is the in-app demo (Apollo + GraphQL).

5. **GraphQL in dev with the standalone server**: set rewrites in `next.config.mjs` and `ROMAIN_RETREAT_SERVER_URL` as in `.env.example` so `/api/retreat-graphql` proxies to `romainRetreatServer`.

## Original shadcn tutorial

The repo started from Payload’s Tailwind + shadcn example. See [Payload: Tailwind and shadcn in the admin](https://payloadcms.com/blog/how-to-setup-tailwindcss-and-shadcn-ui-in-payload) for the general idea. Our stack and env have evolved (Postgres, Apollo, retreat GraphQL) as above.

## Development

Changes under `src/` are picked up on save. Regenerate types after schema changes: `yarn generate:types`. Seed:

- `yarn seed` — full demo content (1 user, 6 categories, 4 media, 3 posts with related-posts, contact form, home + contact pages, header + footer globals). Idempotent: skips when `posts` already has rows. Pass `--force` to wipe collections and reseed (destructive). Auto-runs Drizzle push, so works on a fresh DB. Same script the local Docker `db-init` container runs and the same one used to bootstrap AWS Aurora — point at any DB via `DATABASE_URL=… yarn seed` (see `../romainRetreatServer/DEPLOYMENT.md` §7 for the AWS recipe).
- `yarn seed:posts` — narrow alternative that only adds two lorem-ipsum posts to an empty `posts` collection (useful when you don't want media downloads or pages/globals overwritten).

## Reset password & user role (CLI)

Use these when someone is locked out of `/admin` or hits “Unauthorized, this user does not have access to the admin panel.” Both scripts need **`DATABASE_URL`** and **`PAYLOAD_SECRET`** in `.env` (same as `yarn dev`). Point `DATABASE_URL` at whichever Postgres holds that user (local, Docker federation on `:5433`, Aurora, etc.).

### Reset login password

[`scripts/reset-user-password.mts`](./scripts/reset-user-password.mts) updates the user through Payload so the password is hashed correctly.

```bash
# Your chosen password (≥ 8 characters):
RESET_EMAIL=jim@modsquad.io RESET_PASSWORD='your-new-secret' yarn tsx scripts/reset-user-password.mts

# Or omit RESET_PASSWORD to generate a random one (printed once to the terminal):
RESET_EMAIL=jim@modsquad.io yarn tsx scripts/reset-user-password.mts
```

### Promote or change role (`admin` / `contentManager` / `consumer`)

Only **`admin`** and **`contentManager`** may open the Payload admin UI (`canAccessAdminPanel` in `src/access/roles.ts`). **`consumer`** accounts authenticate but see the unauthorized screen on `/admin`.

[`scripts/set-user-role.mts`](./scripts/set-user-role.mts) sets `role` with `overrideAccess`, so you can fix a stuck account without logging in.

```bash
RESET_EMAIL=jim@modsquad.io RESET_ROLE=admin yarn tsx scripts/set-user-role.mts
```

`RESET_ROLE` must be one of: `admin`, `contentManager`, `consumer`.

After changing **role**, click **Log out** (or clear cookies) and sign in again so the session picks up the updated role in the JWT.
