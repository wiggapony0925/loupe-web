# Multi-stage build for the Loupe web SPA (loupe-web) from the npm workspace.
# loupe-web consumes local @loupe/* workspace packages, so it MUST build from
# the repo root where those packages + the lockfile live. Served by nginx with
# the SPA fallback + /v1 reverse-proxy to the backend (see loupe-web/nginx.conf).
# Deploy: gcloud run deploy loupe-web --source . --region us-central1 --port 8080

# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-slim AS build
WORKDIR /app

# Workspace manifests + lockfile first (better layer caching on source-only edits).
COPY package.json package-lock.json ./
COPY packages ./packages
COPY loupe-web ./loupe-web

# Install the whole workspace; local @loupe/* resolve via workspace symlinks.
RUN npm ci

# tsc --noEmit && vite build → loupe-web/dist
RUN npm run build -w loupe-web

# ── Serve stage ──────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS serve
# Our server block (listens on 8080, SPA fallback, /v1 + share proxying).
COPY loupe-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/loupe-web/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
