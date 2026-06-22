/** Admin-controlled site config — the live Pro plan shape + announcement banner.
 *  Snake_case to mirror the wire payloads (`/admin/config`, `/announcement`). */

export type AnnouncementTone = "info" | "success" | "warning" | "error";

/** The Pro plan shape the developer portal controls. `null` limit = unlimited;
 *  `gate_*` true = Pro-only, false = free for everyone. */
export interface PlanConfig {
  free_card_limit: number | null;
  free_statement_limit: number | null;
  gate_unlimited_cards: boolean;
  gate_scanner_import: boolean;
  gate_full_history: boolean;
  gate_unlimited_alerts: boolean;
  gate_statements: boolean;
}

export interface Announcement {
  enabled: boolean;
  message: string;
  tone: AnnouncementTone;
  cta_label?: string | null;
  cta_href?: string | null;
}

export interface SiteConfig {
  plan: PlanConfig;
  announcement: Announcement;
  updated_at?: string | null;
}

/** Partial update of the plan shape. `clear_*` flags set a limit to unlimited
 *  (since `undefined` can't be distinguished from `null` over the wire). */
export interface PlanConfigUpdate {
  free_card_limit?: number | null;
  free_statement_limit?: number | null;
  gate_unlimited_cards?: boolean;
  gate_scanner_import?: boolean;
  gate_full_history?: boolean;
  gate_unlimited_alerts?: boolean;
  gate_statements?: boolean;
  clear_card_limit?: boolean;
  clear_statement_limit?: boolean;
}

export interface AnnouncementUpdate {
  enabled?: boolean;
  message?: string;
  tone?: AnnouncementTone;
  cta_label?: string | null;
  cta_href?: string | null;
}
