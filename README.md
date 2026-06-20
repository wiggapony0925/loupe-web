# Loupe — Web

Scan, value, and track your trading-card collection like a portfolio.

Loupe turns a shoebox of cards into a live, grade-aware portfolio: search
130,000+ Pokémon, Magic, and Yu-Gi-Oh! cards, track real-time market values,
and manage your vault — on the web and in your pocket.

> 🌐 **Live:** https://loupe-web-714615078104.us-central1.run.app

This repository is the **web client** (a React + TypeScript single-page app) and
the shared `@loupe/core` data layer it consumes. It talks to the Loupe API
(a separate service) over a typed, contract-checked HTTP boundary.

## Stack

- **React 19** + **TypeScript** (strict)
- **Vite** (SPA build) → **nginx** container on Cloud Run
- **Radix UI** primitives + **SCSS Modules** (BEM)
- **TanStack Query** (server state, persisted cache) + **Zustand** (UI state)
- **`@loupe/core`** — shared API client, types, and hooks (TS source workspace)

## Project layout

```
.
├── loupe-web/          # the React SPA (features, components, routes, styles)
├── packages/core/      # @loupe/core — API client, types, React Query hooks
├── Dockerfile          # builds the SPA and serves it via nginx
└── package.json        # npm workspaces: packages/* + loupe-web
```

## Getting started

```bash
npm install
npm run dev --workspace loupe-web      # Vite dev server (proxies /v1 to the API)
```

Copy `loupe-web/.env.example` → `loupe-web/.env` and point it at an API base.

## Scripts (run inside `loupe-web/`)

| Script                  | Purpose                                                |
| ----------------------- | ------------------------------------------------------ |
| `npm run dev`           | Vite dev server with HMR                               |
| `npm run build`         | `tsc --noEmit` + production build                      |
| `npm run typecheck`     | TypeScript only                                        |
| `npm run lint`          | ESLint (zero warnings)                                 |
| `npm run test:contract` | Verify every endpoint the web calls exists in the API  |

## API contract

`npm run test:contract` parses `packages/core` for every endpoint the client
calls and checks each one against the live backend's OpenAPI schema, so the web
can never ship a request to a route the API doesn't serve.

## Deploy

Built and served as a container on Google Cloud Run:

```bash
gcloud run deploy loupe-web --source .
```
