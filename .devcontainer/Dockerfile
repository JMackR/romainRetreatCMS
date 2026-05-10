# Dev environment for romainRetreatCMS (Next.js + Payload). Production builds use repo-root Dockerfile.
FROM mcr.microsoft.com/devcontainers/javascript-node:1-20-bookworm

USER root
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

USER node
