/**
 * Platform injection point. The web app and the Expo app each call
 * `configureApi()` once at startup to supply their base URL, token source, and
 * 401 handler — so this package stays free of `localStorage`, `import.meta`,
 * SecureStore, or any platform global. That's what lets the same logic run on
 * both web and mobile (the CXO "shared logic, separate UI" model).
 */
export interface ApiConfig {
  /** Base URL for the backend. Use "" for same-origin (web proxies /v1). */
  baseUrl: string;
  /** Returns the current bearer token, or null when signed out. */
  getToken?: () => string | null | undefined;
  /** Called when an authenticated request returns 401 (e.g. to sign out). */
  onUnauthorized?: () => void;
}

let config: ApiConfig = { baseUrl: "" };

/** Configure the shared API layer. Call once at app startup. */
export function configureApi(next: Partial<ApiConfig>): void {
  config = { ...config, ...next };
}

/** Read the active config (used internally by the client). */
export function getApiConfig(): ApiConfig {
  return config;
}
