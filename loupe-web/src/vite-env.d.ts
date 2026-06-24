/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_USE_DEMO_DATA?: string;
  /** Sentry DSN — when unset, monitoring is disabled (no-op). */
  readonly VITE_SENTRY_DSN?: string;
  /** Sentry performance trace sample rate (0–1). Defaults to 0.1. */
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
