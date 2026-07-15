/** Admin portal: metrics + user management. */

/** At-a-glance portal metrics (mirrors AdminMetrics). */
export interface AdminMetrics {
  usersTotal: number;
  usersNew7d: number;
  usersNew30d: number;
  admins: number;
  banned: number;
  jobsTotal: number;
  jobsOpen: number;
  applicationsTotal: number;
  applicationsNew7d: number;
  postsTotal: number;
  postsPublished: number;
  waitlistTotal: number;
  waitlistWaiting: number;
}

/** A user row in the admin user table. */
export interface AdminUser {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  /** DB-backed admin grant (what the toggle controls). */
  isAdmin: boolean;
  /** In ADMIN_EMAILS — always admin, can't be demoted/banned/deleted. */
  isSuperAdmin: boolean;
  banned: boolean;
  bannedAt?: string | null;
  banReason?: string | null;
  deleted: boolean;
  /** Loupe Pro plan — "free" | "pro". Comp from the user drawer. */
  plan: string;
  proExpiresAt?: string | null;
  /** In a Stripe free trial. */
  proTrialing: boolean;
  /** Backed by a real Stripe subscription (vs. an admin comp). */
  hasSubscription: boolean;
}

/** A short-lived token for viewing the app as another user. */
export interface ImpersonateResult {
  token: string;
  email: string;
  expiresIn: number;
}

/** Result of refunding a user's latest charge. */
export interface RefundResult {
  refundId: string;
  chargeId: string;
  amountUsd: number;
  currency: string;
  status: string;
}

export interface AdminUserPage {
  results: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminUsersParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

/** Full per-user record for the admin detail drawer. */
export interface AdminUserDetail extends AdminUser {
  updatedAt?: string | null;
  /** "password" | "apple" | "google" | "unknown". */
  authMethod: string;
  gradesCount: number;
  watchlistCount: number;
  scansCount: number;
  estimatedValueUsd: number;
}

/** A freshly-created sandbox account (password shown once). */
export interface TestAccount {
  id: string;
  email: string;
  password: string;
}

// --- Card data lineage ("Card Tree") ---

/** One unified-model field and which layer supplies it. */
export interface CardTreeField {
  field: string;
  from: string;
  note: string;
}

/** A catalog provider in the lineage graph. */
export interface CardTreeSource {
  id: string;
  label: string;
  url: string;
  games: string[];
  game_keys: string[];
  provides: string[];
  embedded_price: boolean;
  key_required: boolean;
}

/** Per-game routing: which catalog provider + price strategy feeds a game. */
export interface CardTreeGame {
  tcg: string;
  label: string;
  catalog_source: string;
  catalog_label: string;
  price: string;
}

/** One step in the ordered price fallback chain. */
export interface CardTreePriceStep {
  order: number;
  id: string;
  configured: boolean;
}

/** Live monthly request budget for a metered catalog provider (e.g. apitcg). */
export interface CardTreeBudget {
  integration: string;
  period: string;
  used: number;
  limit: number;
  remaining: number;
  soft_ceiling: number;
  exhausted: boolean;
}

/** The full card/set data-lineage tree. */
export interface CardTree {
  card_model: { name: string; fields: CardTreeField[] };
  set_model: { name: string; fields: CardTreeField[] };
  catalog_sources: CardTreeSource[];
  games: CardTreeGame[];
  price_chain: CardTreePriceStep[];
  budgets?: CardTreeBudget[];
}

