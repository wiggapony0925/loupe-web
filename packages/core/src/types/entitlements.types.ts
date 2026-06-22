/** Loupe Pro entitlements — the signed-in user's effective access.
 *
 * The server computes this (honouring the `subscriptions_enabled` kill switch);
 * the client only reads it to render gates, badges, and the paywall. Snake_case
 * to mirror the `User` wire type returned by `/me`. */

export type Plan = "free" | "pro";

export interface PlanLimits {
  /** Max cards the user may track. `null` = unlimited. */
  max_cards: number | null;
  /** Statement PDFs a free user may download (their latest N). `null` = unlimited. */
  free_statements?: number | null;
}

export interface PlanFeatures {
  unlimited_cards: boolean;
  scanner_import: boolean;
  full_history: boolean;
  unlimited_alerts: boolean;
  statements: boolean;
  pro_badge: boolean;
}

export interface Entitlements {
  plan: Plan;
  is_pro: boolean;
  /** True while Pro access is a free trial. */
  trialing: boolean;
  /** When false the whole monetization layer is off — hide every upgrade CTA. */
  subscriptions_enabled: boolean;
  pro_since?: string | null;
  pro_expires_at?: string | null;
  /** Live count of owned cards (drives the "X of 50" meter). */
  card_count: number;
  limits: PlanLimits;
  features: PlanFeatures;
}

/** `GET /me/billing/config` — pricing + whether real checkout is live. */
export interface BillingConfig {
  checkout_available: boolean;
  /** Stripe publishable key for the in-app Payment Element (safe to expose). */
  publishable_key: string;
  price_monthly_usd: number;
  price_yearly_usd: number;
  /** Free-trial length in days (0 = no trial). */
  trial_days: number;
}

/** `POST /me/billing/subscribe` — a subscription whose payment the in-app
 *  Payment Element confirms with the returned `client_secret`. */
export interface SubscribeResult {
  status: "ready" | "unavailable";
  /** `setup` (trial: vault the card) or `payment` (charge now). */
  mode?: "setup" | "payment";
  client_secret?: string | null;
  subscription_id?: string;
}

/** `POST /me/billing/checkout` result. `unavailable` = pre-Stripe graceful state. */
export interface CheckoutResult {
  status: "checkout" | "unavailable";
  /** Present when `status === "checkout"` — redirect the browser here. */
  url?: string;
  /** Present when `status === "unavailable"` — friendly "launching soon" copy. */
  message?: string;
}

/** `POST /me/billing/portal` — a Stripe Customer Portal link (manage/cancel). */
export interface PortalSession {
  url: string;
}
