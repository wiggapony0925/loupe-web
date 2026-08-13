import { getApiModePreference, resolveApiBaseUrl } from "@/lib/apiMode";
import { initSentry } from "@/observability/sentry";
import { configureApi } from "@loupe/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Capture `beforeinstallprompt` before React mounts (the event fires once,
// early) — Settings surfaces the actual install button.
import App from "@/App";
import "@/lib/installPrompt";
import "@/styles/global.scss";

// Error + performance monitoring. No-op unless VITE_SENTRY_DSN is set.
initSentry();

const apiMode = getApiModePreference();
const baseUrl = resolveApiBaseUrl(apiMode);

configureApi({
  baseUrl,
  getToken: () => localStorage.getItem("loupe.auth.token"),
  withCredentials: !import.meta.env.VITE_API_URL?.trim(),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
