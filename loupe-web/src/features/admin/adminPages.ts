/**
 * The single source of truth for the developer portal's pages.
 *
 * Both the sidebar nav (AdminLayout) and the router (`/admin/*`) are derived
 * from this list, so they can never drift — adding a page here wires up its
 * route, its nav entry, and its feature flag in one place.
 *
 * Every page is gated by a feature flag (`admin_*`) so it can be toggled from
 * the Feature flags page without a deploy, EXCEPT the `core` pages (Overview +
 * Feature flags themselves), which stay always-on so an admin can never lock
 * themselves out of the controls.
 *
 * This module is pure data (no React/icon imports) so the eager router bundle
 * can import it cheaply; icons live alongside the nav in AdminLayout.
 */

export type AdminGroup =
  | "Operations"
  | "Monetization"
  | "People"
  | "Catalog & product"
  | "Growth"
  | "Content & hiring"
  | "Tools";

export interface AdminPage {
  /** Path segment under `/admin` — also the stable nav key. */
  path: string;
  /** Named export in the admin barrel (`@/features/admin`). */
  component: string;
  label: string;
  /** One-word hint shown under the label while searching. */
  hint: string;
  group: AdminGroup;
  /**
   * Feature-flag key gating this page. Omitted for `core` pages that must
   * always remain reachable (Overview + Feature flags) so the portal can't be
   * locked out by a flag.
   */
  flag?: string;
}

/** Group render order in the sidebar. */
export const ADMIN_GROUP_ORDER: AdminGroup[] = [
  "Operations",
  "Monetization",
  "People",
  "Catalog & product",
  "Growth",
  "Content & hiring",
  "Tools",
];

export const ADMIN_PAGES: AdminPage[] = [
  // ── Operations ──
  {
    path: "overview",
    component: "AdminOverview",
    label: "Overview",
    hint: "Dashboard",
    group: "Operations",
  },
  {
    path: "health",
    component: "AdminHealth",
    label: "System health",
    hint: "Live status",
    group: "Operations",
    flag: "admin_health",
  },
  {
    path: "database",
    component: "AdminDatabase",
    label: "Database",
    hint: "Schema & rows",
    group: "Operations",
    flag: "admin_database",
  },
  {
    path: "cloud",
    component: "AdminCloud",
    label: "Google Cloud",
    hint: "Run & SQL",
    group: "Operations",
    flag: "admin_cloud",
  },
  {
    path: "env",
    component: "AdminEnv",
    label: "Environment",
    hint: "Config & secrets",
    group: "Operations",
    flag: "admin_env",
  },
  {
    path: "integrations",
    component: "AdminIntegrations",
    label: "Integrations",
    hint: "External services",
    group: "Operations",
    flag: "admin_integrations",
  },
  {
    path: "email",
    component: "AdminEmail",
    label: "Email",
    hint: "Templates & tests",
    group: "Operations",
    flag: "admin_email",
  },
  {
    path: "audit",
    component: "AdminAudit",
    label: "Audit log",
    hint: "Activity trail",
    group: "Operations",
    flag: "admin_audit",
  },

  // ── Monetization ──
  {
    path: "revenue",
    component: "AdminRevenue",
    label: "Revenue",
    hint: "MRR & churn",
    group: "Monetization",
    flag: "admin_revenue",
  },
  {
    path: "pro",
    component: "AdminPro",
    label: "Loupe Pro",
    hint: "Plans & gates",
    group: "Monetization",
    flag: "admin_pro",
  },
  {
    path: "announce",
    component: "AdminAnnounce",
    label: "Announcements",
    hint: "Banner to all users",
    group: "Monetization",
    flag: "admin_announce",
  },
  {
    path: "flags",
    component: "AdminFlags",
    label: "Feature flags",
    hint: "Toggle micro-apps",
    group: "Monetization",
  },
  {
    path: "carousels",
    component: "AdminCarousels",
    label: "Carousels",
    hint: "Registry + AI shelves",
    group: "Monetization",
    flag: "admin_carousels",
  },

  // ── People ──
  {
    path: "users",
    component: "AdminUsers",
    label: "Users",
    hint: "Search, roles, bans",
    group: "People",
    flag: "admin_users",
  },

  // ── Catalog & product ──
  {
    path: "catalog",
    component: "AdminCatalog",
    label: "Catalog",
    hint: "Coverage by game",
    group: "Catalog & product",
    flag: "admin_catalog",
  },
  {
    path: "carousels",
    component: "AdminCarousels",
    label: "Carousels",
    hint: "Storefront shelves",
    group: "Catalog & product",
    flag: "admin_carousels",
  },
  {
    path: "pricecharting",
    component: "AdminPriceCharting",
    label: "PriceCharting",
    hint: "Tier & fallback",
    group: "Catalog & product",
    flag: "admin_pricecharting",
  },
  {
    path: "cards",
    component: "AdminCards",
    label: "Card data",
    hint: "Explore & override",
    group: "Catalog & product",
    flag: "admin_cards",
  },
  {
    path: "card-tree",
    component: "AdminCardTree",
    label: "Card tree",
    hint: "Data lineage",
    group: "Catalog & product",
    flag: "admin_card_tree",
  },
  {
    path: "grades",
    component: "AdminGrades",
    label: "Grade review",
    hint: "QA graded cards",
    group: "Catalog & product",
    flag: "admin_grades",
  },
  {
    path: "scanner",
    component: "AdminScanner",
    label: "Scanner",
    hint: "Identify funnel",
    group: "Catalog & product",
    flag: "admin_scanner",
  },

  // ── Growth ──
  {
    path: "pulse",
    component: "AdminPulse",
    label: "Live pulse",
    hint: "Activity feed",
    group: "Growth",
    flag: "admin_pulse",
  },
  {
    path: "engagement",
    component: "AdminEngagement",
    label: "Engagement",
    hint: "Retention & funnel",
    group: "Growth",
    flag: "admin_engagement",
  },
  {
    path: "retention",
    component: "AdminRetention",
    label: "Retention",
    hint: "Cohort triangle",
    group: "Growth",
    flag: "admin_retention",
  },

  // ── Content & hiring ──
  {
    path: "jobs",
    component: "AdminJobs",
    label: "Jobs",
    hint: "Open roles",
    group: "Content & hiring",
    flag: "admin_jobs",
  },
  {
    path: "applications",
    component: "AdminApplications",
    label: "Applications",
    hint: "Inbound",
    group: "Content & hiring",
    flag: "admin_applications",
  },
  {
    path: "blog",
    component: "AdminBlog",
    label: "Blog",
    hint: "Posts",
    group: "Content & hiring",
    flag: "admin_blog",
  },
  {
    path: "waitlist",
    component: "AdminWaitlist",
    label: "Scanner waitlist",
    hint: "Hardware",
    group: "Content & hiring",
    flag: "admin_waitlist",
  },

  // ── Tools ──
  {
    path: "insights",
    component: "AdminInsights",
    label: "Ask your data",
    hint: "NL → SQL",
    group: "Tools",
    flag: "admin_insights",
  },
  {
    path: "api",
    component: "AdminApiInspector",
    label: "API inspector",
    hint: "Live API traffic",
    group: "Tools",
    flag: "admin_api",
  },
  {
    path: "console",
    component: "AdminConsole",
    label: "API console",
    hint: "Run GET requests",
    group: "Tools",
    flag: "admin_console",
  },
  {
    path: "simulator",
    component: "AdminSimulator",
    label: "Device simulator",
    hint: "Preview",
    group: "Tools",
    flag: "admin_simulator",
  },
  {
    path: "navkeys",
    component: "AdminNavKeys",
    label: "Nav keys",
    hint: "Sign-in deep links",
    group: "Tools",
    flag: "admin_navkeys",
  },
];

/** Default landing page when hitting `/admin`. */
export const ADMIN_INDEX_PATH = "overview";

/** Every gating flag key — handy for tooling/tests. Mirrors the backend seeder. */
export const ADMIN_FLAG_KEYS: string[] = ADMIN_PAGES.flatMap((p) => (p.flag ? [p.flag] : []));
