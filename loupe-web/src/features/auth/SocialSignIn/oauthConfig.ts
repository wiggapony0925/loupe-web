/**
 * OAuth client config — single source of truth, read from build-time env.
 * Set these in `.env` (and the deploy environment) to enable social sign-in:
 *
 *   VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
 *   VITE_APPLE_CLIENT_ID=com.loupe.web   (Apple "Services ID")
 *
 * When unset, the corresponding button simply doesn't render — the email/
 * password form keeps working. The backend verifies the provider token's
 * audience against the *same* IDs, so both sides must match.
 */
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "") as string;
export const APPLE_CLIENT_ID = (import.meta.env.VITE_APPLE_CLIENT_ID ?? "") as string;

export const GOOGLE_GSI_SRC = "https://accounts.google.com/gsi/client";
export const APPLE_JS_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

/** True when at least one social provider is configured. */
export const hasSocialSignIn = Boolean(GOOGLE_CLIENT_ID || APPLE_CLIENT_ID);
