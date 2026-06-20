# loupe-web

The **desktop web client** for Loupe — a Chase/CXO-style hybrid front end that shares
the same `loupe-backend` BFF as the Expo mobile app, but ships its own web-native UI.

- **Stack:** React 19 · TypeScript (strict) · Vite · Radix UI (headless) · SCSS Modules
- **State:** TanStack Query (server) · Zustand (global UI) · React Context (theme only)
- **Theming:** `data-theme="light|dark"` on `<html>`, CSS custom properties mirroring the
  RN app's `tokens.ts` 1:1. No-flash bootstrap in `index.html`; `useTheme()` toggles it.

## Live

Deployed to Cloud Run: **https://loupe-web-714615078104.us-central1.run.app**
(`gcloud` project `loupe-app-56235`, region `us-central1`).

## Architecture

```
src/
  styles/        tokens.scss (palette → CSS vars), helpers (mixins), reset, global
  theme/         ThemeProvider + useTheme (data-theme attribute), token refs for SVG
  lib/
    api/         client.ts (envelope-aware fetch), endpoints.ts, cards.ts (adapters)
    types.ts     view models · format.ts (tabular money/percent) · cx.ts
  hooks/         useCards.ts — useTrending / useSearch / usePriceHistory / useMarket / useCard
  stores/        uiStore.ts (Zustand, sidebar)
  providers/     AppProviders (QueryClient + ThemeProvider)
  components/    headless Radix + SCSS-module library (Button, Panel, Sparkline,
                 SparkRow, LiveSparkRow, ShopCard, Badge, Delta, ThemeToggle, …)
  layout/        AppShell · Sidebar · TopBar (Chase-style frame)
  features/      commandCenter · vault · discover · markets · watchlist · cardDetail · settings
  routes/        router.tsx (react-router)
```

## Data: live, no demo

Everything renders from the live backend. Public endpoints (no auth) drive the
market surfaces; personal surfaces are gated behind sign-in (never fabricated):

| Surface | Source | Auth |
| --- | --- | --- |
| Command Center, Discover, Markets | `/v1/cards/trending` | public |
| Featured hero + row sparklines | `/v1/cards/:id/prices` | public |
| Card detail | `/v1/cards/:id/{canonical,market,prices}` | public |
| Vault, Watchlist | `/v1/grades`, `/v1/home/feed` → `SignInGate` | auth (401) |

The browser always talks to a **same-origin `/v1`** (no CORS): Vite proxies it in dev,
nginx reverse-proxies it in prod (see `vite.config.ts` / `nginx.conf`).

## Scripts

```bash
npm run dev        # Vite dev server on :5173 (proxies /v1 to the live backend)
npm run build      # tsc --noEmit && vite build  → dist/
npm run preview     # serve the production build locally
npm run typecheck  # strict tsc, no emit
```

## Deploy

```bash
gcloud run deploy loupe-web --source . \
  --project loupe-app-56235 --region us-central1 \
  --allow-unauthenticated --port 8080
```

Multi-stage `Dockerfile` builds the SPA and serves it with nginx (SPA fallback +
`/v1` reverse-proxy to the backend Cloud Run service).
