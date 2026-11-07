# syntax=docker/dockerfile:1
#
# CrisisLink web image: the built static files served by nginx, which also forwards /api and
# /socket.io to the API container. Build from the REPOSITORY ROOT:
#   docker build -f apps/web/Dockerfile -t crisislink-web .

ARG NODE_VERSION=22

# ---- 1. build the static site -------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @crisislink/web --include-workspace-root=false --ignore-scripts
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
# Optional: an API on another domain (default: same origin, proxied by nginx below).
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build -w @crisislink/web

# ---- 2. serve with nginx ------------------------------------------------------------------
FROM nginx:1.29-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
