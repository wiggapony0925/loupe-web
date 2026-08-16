export type ApiMode = "live" | "local";

/**
 * Live = SAME ORIGIN. nginx proxies `/v1` to Cloud Run (see nginx.conf), so a
 * relative base reaches the same backend an absolute URL would — and it is the
 * only form the deployed page is allowed to use.
 *
 * THIS WAS AN ABSOLUTE URL AND IT BROKE THE WHOLE SITE. The deployed CSP is
 *
 *     connect-src 'self' https://accounts.google.com https://appleid.apple.com
 *
 * with a comment above it in nginx.conf saying, in as many words, that
 * `connect-src 'self'` keeps API calls same-origin. Pointing `live` at
 * `https://loupe-api-….run.app` made every request cross-origin, so the
 * browser refused all of them before they were sent:
 *
 *     Connecting to 'https://loupe-api-….run.app/v1/announcement' violates
 *     the following Content Security Policy directive: "connect-src 'self' …"
 *
 * Not login specifically — EVERY call. Sign in, the announcement, FX rates,
 * all of it, on a page that otherwise rendered normally, which is why it read
 * as "logging in on the website is broken" rather than "the site is offline".
 *
 * Keeping it relative also keeps the proxy doing its job: same-origin cookies,
 * no preflight, and the API host stays an implementation detail rather than
 * something baked into a shipped bundle.
 */
export const LIVE_BACKEND_URL = "";
export const LOCAL_BACKEND_URL = "http://127.0.0.1:8099";
export const API_MODE_KEY = "loupe.api.mode";

export function getEnvApiMode(): ApiMode {
  const mode = import.meta.env.VITE_API_MODE;
  return mode === "local" ? "local" : "live";
}

export function getStoredApiMode(): ApiMode | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(API_MODE_KEY);
  return raw === "local" || raw === "live" ? raw : null;
}

export function getApiModePreference(): ApiMode {
  return getStoredApiMode() ?? getEnvApiMode();
}

export function resolveApiBaseUrl(mode: ApiMode = getApiModePreference()): string {
  const explicit = import.meta.env.VITE_API_URL?.trim();
  if (explicit) return explicit;
  return mode === "local" ? LOCAL_BACKEND_URL : LIVE_BACKEND_URL;
}

export function setApiModePreference(mode: ApiMode): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(API_MODE_KEY, mode);
  }
}
