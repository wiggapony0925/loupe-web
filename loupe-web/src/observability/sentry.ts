import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry error + performance monitoring.
 *
 * No-op unless `VITE_SENTRY_DSN` is set, so local dev and any environment
 * without a DSN behave exactly as before (nothing is sent). Call once before
 * the app renders.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    // Performance sampling — low by default; tune per-env via env var.
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    sendDefaultPii: false,
  });
}

/**
 * Report a caught error (used by the app-level ErrorBoundary). Guarded so it
 * stays a no-op when Sentry isn't configured.
 */
export function reportError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

/**
 * Attach (or clear) the signed-in user so every error report is attributed.
 * Pass `null` on logout. No-op unless Sentry is configured.
 */
export function setSentryUser(user: { id: string; email?: string } | null): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.setUser(user ? { id: user.id, email: user.email } : null);
}
