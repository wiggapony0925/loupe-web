import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Backend the dev server proxies `/v1` + `/health` to. Defaults to the live
// Cloud Run backend so `npm run dev` shows real data same-origin (no CORS, no
// local backend required). Set `LOUPE_API_PROXY` to point at a local backend
// (e.g. http://127.0.0.1:8099) when developing API changes.
const API_TARGET = process.env.LOUPE_API_PROXY || "https://loupe-api-wrrcqaayra-uc.a.run.app";

// Vite config — React SPA, `@/` alias, and SCSS helpers auto-injected into every module.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Pure functions/mixins/variables (no CSS output) made available to every *.module.scss.
        additionalData: `@use "@/styles/helpers" as *;`,
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/v1": { target: API_TARGET, changeOrigin: true, secure: true },
      "/health": { target: API_TARGET, changeOrigin: true, secure: true },
    },
  },
});
