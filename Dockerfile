# Production image for ECS / App Runner / EC2 — `next.config.ts` uses `output: "standalone"`.
# Build: docker build -t romain-retreat-cms .
# Run:  docker run --rm -p 3000:3000 --env-file .env.production.local romain-retreat-cms

FROM node:20-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

FROM base AS deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 300000

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time env: pass real values in CI (CodeBuild) or `docker build --build-arg` as needed.
ARG NEXT_PUBLIC_SERVER_URL
ARG PAYLOAD_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}
ENV PAYLOAD_SERVER_URL=${PAYLOAD_SERVER_URL}
RUN yarn build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
