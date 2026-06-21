/**
 * OAuth client config — single source of truth.
 *
 * Defaults are the **public** client identifiers the backend already accepts
 * (its `GOOGLE_WEB_CLIENT_ID` / `APPLE_CLIENT_ID` audiences). These are not
 * secrets — a Google web client id and an Apple Services id are designed to be
 * embedded in client-side JS. Override per-environment with build-time env:
 *
 *   VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
 *   VITE_APPLE_CLIENT_ID=app.loupe.client   (Apple "Services ID")
 *
 * The backend verifies the provider token's audience against the *same* ids,
 * so both sides must match. Note: for the live origin to actually authenticate
 * the web app's URL must be an Authorized JavaScript origin on the Google
 * client, and a registered web domain + return URL on the Apple Services id.
 */
const DEFAULT_GOOGLE_CLIENT_ID =
  "714615078104-5889qdd0u7tsoc27gsgcmpdq8aacrhlf.apps.googleusercontent.com";
const DEFAULT_APPLE_CLIENT_ID = "app.loupe.client";

export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  DEFAULT_GOOGLE_CLIENT_ID) as string;
export const APPLE_CLIENT_ID = (import.meta.env.VITE_APPLE_CLIENT_ID ||
  DEFAULT_APPLE_CLIENT_ID) as string;

export const GOOGLE_GSI_SRC = "https://accounts.google.com/gsi/client";
export const APPLE_JS_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

/** True when at least one social provider is configured. */
export const hasSocialSignIn = Boolean(GOOGLE_CLIENT_ID || APPLE_CLIENT_ID);
