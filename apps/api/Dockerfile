# syntax=docker/dockerfile:1
#
# CrisisLink API image. Build from the REPOSITORY ROOT (it needs packages/shared):
#   docker build -f apps/api/Dockerfile -t crisislink-api .
#
# MULTI-STAGE BUILD: compilers and dev tools live in throwaway stages; the final image holds
# only Node, production dependencies and the bundled dist/index.js - smaller, faster to
# deploy, and less software for an attacker to abuse.

ARG NODE_VERSION=22

# ---- 1. build: install everything, compile TypeScript into one bundle ----------------------
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app
# Copy package manifests first: Docker caches this layer, so `npm ci` only re-runs when
# dependencies change - not on every source edit (LAYER CACHING).
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# The API's postinstall runs `prisma generate`, which needs the schema.
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/
RUN npm ci --workspace @crisislink/api --include-workspace-root=false
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @crisislink/api

# ---- 2. migrate: one-off job that applies database migrations before a release -----------
# docker compose runs it as the `migrate` service; hosts call it a "release" or "pre-deploy" command.
FROM build AS migrate
WORKDIR /app/apps/api
CMD ["npx", "prisma", "migrate", "deploy"]

# ---- 3. production dependencies only (no TypeScript, Prisma CLI, test tools...) ------------
FROM node:${NODE_VERSION}-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# --ignore-scripts: skip `prisma generate` (the generated client is already bundled in dist).
RUN npm ci --omit=dev --ignore-scripts --workspace @crisislink/api --include-workspace-root=false
# npm hoists most packages to /app/node_modules; apps/api/node_modules only exists when two
# versions of a package conflict. Create it so the COPY below works either way.
RUN mkdir -p apps/api/node_modules

# ---- 4. runtime: what actually runs in production -----------------------------------------
FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY apps/api/package.json ./apps/api/
WORKDIR /app/apps/api
# Never run as root: if the app is ever compromised, the attacker is an unprivileged user.
USER node
EXPOSE 4000
# Lets Docker (and compose) know when the container is actually able to serve.
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:'+(process.env.PORT||4000)+'/api/health/live').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
# `node` directly (not `npm start`) so SIGTERM reaches the app and graceful shutdown runs.
CMD ["node", "dist/index.js"]
