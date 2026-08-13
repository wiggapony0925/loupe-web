export type ApiMode = "live" | "local";

export const LIVE_BACKEND_URL = "https://loupe-api-714615078104.us-central1.run.app";
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
