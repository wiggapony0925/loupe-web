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
