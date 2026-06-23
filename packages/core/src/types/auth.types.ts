/** Identity + auth (user, tokens, sign-in/up). */

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  /** True when the user is in the backend admin allowlist (drives portal access). */
  is_admin?: boolean;
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
