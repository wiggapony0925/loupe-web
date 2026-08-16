import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

// moderato publishes to npm from `dist`, so its package exports point there —
// correct for the world, wrong for us: it would mean a `npm run build` in
// ../moderato before any edit showed up here. Alias the subpaths back to
// source so the dev server compiles them like any other file and HMR works.
// `verify:package` in that repo is what proves the *published* resolution,
// which this deliberately bypasses.
//
// Guarded on the checkout existing: an install that got moderato from the
// registry instead of the workspace should resolve it the normal way, not
// die on a path that isn't there.
const moderatoSrc = fileURLToPath(new URL("../moderato/src", import.meta.url));
const moderatoAlias = existsSync(moderatoSrc)
  ? {
      // Longest first — Vite's object aliases match by prefix.
      "moderato/react": `${moderatoSrc}/react/index.ts`,
      "moderato/web": `${moderatoSrc}/web/index.tsx`,
      "moderato/server": `${moderatoSrc}/server/index.ts`,
      moderato: `${moderatoSrc}/index.ts`
    }
  : {};

// Backend the dev server proxies `/v1` + `/health` to. Defaults to the live
// Cloud Run backend so `npm run dev` shows real data same-origin (no CORS, no
// local backend required). Set `LOUPE_API_PROXY` to point at a local backend
// (e.g. http://127.0.0.1:8099) when developing API changes.
const API_TARGET = process.env.LOUPE_API_PROXY || "https://loupe-api-714615078104.us-central1.run.app";

// Vite config — React SPA, `@/` alias, and SCSS helpers auto-injected into every module.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      ...moderatoAlias
    },
    // moderato is a linked workspace package with its OWN node_modules
    // (it ships to npm and installs standalone). Without dedupe, imports
    // resolved through the symlink find that copy of React → two Reacts,
    // broken hooks.
    dedupe: ["react", "react-dom"]
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Pure functions/mixins/variables (no CSS output) made available to every *.module.scss.
        additionalData: `@use "@/styles/helpers" as *;`
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/v1": {
        target: API_TARGET,
        changeOrigin: true,
        secure: true
      },
      "/health": {
        target: API_TARGET,
        changeOrigin: true,
        secure: true
      },
      "/ws": {
        target: API_TARGET,
        changeOrigin: true,
        secure: true,
        ws: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendor libs into long-cached chunks so a code change
        // doesn't re-download React/Query/Radix, and the per-route chunks
        // (lazy-loaded in the router) stay small.
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query", "@tanstack/react-query-persist-client", "@tanstack/query-sync-storage-persister"],
          "vendor-ui": ["radix-ui", "lucide-react"]
        }
      }
    }
  }
});