/** Identity + auth (user, tokens, sign-in/up). */

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  /** True when the user is in the backend admin allowlist (drives portal access). */
  is_admin?: boolean;
  /** True once the address is confirmed (verify link, or a social provider). */
  email_verified?: boolean;
}

/** Per-user settings from `GET /v1/me/settings` (snake_case wire shape, like {@link User}). */
export interface UserSettings {
  currency: string;
  /** Active portfolio (collection) id; null = the "All" view. Shared across mobile + web. */
  active_collection_id: string | null;
  theme: "system" | "light" | "dark";
  live_sync_enabled: boolean;
  push_notifications_enabled: boolean;
  /** Opt-in for product-update + blog emails; security/account emails always send. */
  email_announcements_enabled: boolean;
  updated_at: string | null;
}

/** Body for `PATCH /v1/me/settings` — omitted fields are left unchanged. */
export interface UserSettingsUpdate {
  currency?: string;
  /** Send `null` to clear back to the "All" view; omit to leave unchanged. */
  active_collection_id?: string | null;
  theme?: "system" | "light" | "dark";
  live_sync_enabled?: boolean;
  push_notifications_enabled?: boolean;
  email_announcements_enabled?: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  display_name?: string;
}

/** Body for `POST /v1/auth/change-password` (signed-in users). */
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

/** Body for `POST /v1/auth/google` — an ID token from the Google Identity SDK. */
export interface GoogleSignInRequest {
  id_token: string;
  display_name?: string;
}

/** Body for `POST /v1/auth/apple` — an identity token from the Apple JS SDK. */
export interface AppleSignInRequest {
  identity_token: string;
  nonce?: string;
  display_name?: string;
}

/**
 * Result of `POST /v1/auth/login`. A backward-compatible superset of
 * {@link TokenPair}: a normal sign-in carries the tokens (`mfa_required` false);
 * a 2FA-enabled account withholds them and returns `mfa_token` for the second
 * step at `/auth/mfa/verify`.
 */
export interface LoginResult {
  access_token?: string | null;
  refresh_token?: string | null;
  token_type?: string;
  expires_in?: number | null;
  user?: User | null;
  mfa_required: boolean;
  mfa_token?: string | null;
}

/** Body for `POST /v1/auth/mfa/verify` (login second step). */
export interface MfaVerifyRequest {
  mfa_token: string;
  code: string;
}

/** Enrollment material from `POST /v1/auth/mfa/setup`. */
export interface MfaSetup {
  /** Base32 TOTP secret, for manual entry into an authenticator app. */
  secret: string;
  /** `otpauth://` URI the QR encodes. */
  otpauth_uri: string;
  /** Inline `data:image/svg+xml` QR image. */
  qr_svg: string;
}

/** One-time backup codes returned by `POST /v1/auth/mfa/enable`. */
export interface MfaEnableResult {
  backup_codes: string[];
}

/** Whether the signed-in user has two-factor enabled. */
export interface MfaStatus {
  enabled: boolean;
}
