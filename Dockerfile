# Build the Loupe web SPA from the npm workspace (it consumes @loupe/core source).
FROM node:20-alpine AS build
WORKDIR /app

# Copy manifests first for dependency-layer caching, then install with
# workspace symlinks intact (root lockfile drives all workspaces).
COPY package.json package-lock.json ./
COPY packages/core/package.json ./packages/core/package.json
COPY packages/chart/package.json ./packages/chart/package.json
COPY packages/tokens/package.json ./packages/tokens/package.json
COPY loupe-web/package.json ./loupe-web/package.json
RUN npm ci

# Copy sources and build the web workspace (tsc --noEmit && vite build).
COPY packages ./packages
COPY loupe-web ./loupe-web
RUN npm run build --workspace loupe-web

# ── Serve the static build via nginx (proxies /v1 → backend, SPA fallback) ──
FROM nginx:1.27-alpine
COPY loupe-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/loupe-web/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
