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
