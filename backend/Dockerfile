# trackify API — Cloud Run container
# Multi-stage: deps → build → slim runtime. Prisma needs openssl at both stages.

FROM node:22-slim AS build
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
COPY src/models/schema.prisma ./src/models/schema.prisma
RUN npm ci
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json
RUN npm prune --omit=dev

FROM node:22-slim AS runtime
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json
# Schema ships with the image so `npx prisma migrate deploy` can run as a
# Cloud Run job / release step against Cloud SQL.
COPY --from=build --chown=node:node /app/src/models/schema.prisma ./src/models/schema.prisma

USER node
EXPOSE 8080
CMD ["node", "dist/server.js"]
