/** Shared view-model + wire types, split by domain. */

export * from "./admin.types";
export * from "./alerts.types";
export * from "./auth.types";
export * from "./blog.types";
export * from "./card.types";
export * from "./cardAdmin.types";
export * from "./careers.types";
export * from "./catalog.types";
export * from "./config.types";
export * from "./engagement.types";
export * from "./entitlements.types";
export * from "./flags.types";
export * from "./gradeReview.types";
export * from "./insights.types";
export * from "./money.types";
export * from "./ops.types";
export * from "./portfolio.types";
export * from "./aiAdmin.types";
export * from "./carouselAdmin.types";
export * from "./pulse.types";
export * from "./recents.types";
export * from "./report.types";
export * from "./retention.types";
export * from "./revenue.types";
export * from "./scanner.types";
export * from "./sealed.types";
export * from "./search.types";
export * from "./vault.types";
export * from "./social.types";
export * from "./waitlist.types";

/* ── Admin notifications (push + in-app inbox) ─────────────────────────── */

/** Broad grouping the clients filter and tint by. */
export type NotificationCategory =
  | "market"
  | "news"
  | "social"
  | "billing"
  | "system";

export interface AdminNotificationInput {
  title: string;
  body?: string | null;
  category: NotificationCategory;
  /** In-app path, e.g. `/app/vault` — not a URL; clients resolve it. */
  href?: string | null;
  image_url?: string | null;
  /** Omit to broadcast to every active user; set to notify one person. */
  user_id?: string | null;
  /** False writes the inbox row without buzzing anyone's phone. */
  push?: boolean;
  /** Preview only: report the audience without writing anything. */
  dry_run?: boolean;
}

export interface AdminNotificationResult {
  created: number;
  audience: number;
  dry_run: boolean;
}

/** Real reach, so the composer can say "312 users · 87 devices". */
export interface NotificationAudience {
  users: number;
  devices: number;
  push_enabled: number;
}

export interface NotificationRow {
  id: string;
  category: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  image_url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPage {
  items: NotificationRow[];
  total: number;
  page: number;
  page_size: number;
  unread: number;
}
