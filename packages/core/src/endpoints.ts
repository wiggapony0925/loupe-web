/** HTTP path map for loupe-backend. Mirrors the routes in loupe-frontend. */
const V1 = "/v1";

export const ENDPOINTS = {
  system: { health: "/health", version: "/version" },
  auth: {
    login: `${V1}/auth/login`,
    register: `${V1}/auth/register`,
    devLogin: `${V1}/auth/dev-login`,
    refresh: `${V1}/auth/refresh`,
  },
  me: { root: `${V1}/me`, settings: `${V1}/me/settings` },
  home: { feed: `${V1}/home/feed` },
  analytics: { overview: `${V1}/analytics/overview` },
  cards: {
    search: `${V1}/cards/search`,
    trending: `${V1}/cards/trending`,
    resolve: `${V1}/cards/resolve`,
    item: (id: string) => `${V1}/cards/${id}`,
    prices: (id: string, range?: string) =>
      `${V1}/cards/${id}/prices${range ? `?range=${encodeURIComponent(range)}` : ""}`,
    market: (id: string) => `${V1}/cards/${id}/market`,
    canonical: (id: string) => `${V1}/cards/${id}/canonical`,
    marketplacePrices: (id: string) => `${V1}/cards/${id}/marketplace-prices`,
    valuation: (id: string) => `${V1}/cards/${id}/valuation`,
    identify: `${V1}/cards/identify`,
  },
  /** Public web storefront — server-side search/trending derivation. */
  public: {
    search: `${V1}/public/search`,
    trending: `${V1}/public/trending`,
    browse: `${V1}/public/browse`,
  },
  grades: {
    mine: `${V1}/grades`,
    create: `${V1}/grades`,
    summary: `${V1}/grades/summary`,
    item: (id: string) => `${V1}/grades/${id}`,
  },
  collections: {
    list: `${V1}/collections`,
    create: `${V1}/collections`,
    items: (id: string) => `${V1}/collections/${id}/items`,
  },
  watchlist: {
    list: `${V1}/watchlist`,
    add: `${V1}/watchlist`,
    remove: (cardId: string) => `${V1}/watchlist/${cardId}`,
  },
  /** Public developer-portal surface — careers + blog. */
  careers: {
    jobs: `${V1}/careers/jobs`,
    job: (slug: string) => `${V1}/careers/jobs/${encodeURIComponent(slug)}`,
    apply: (jobId: string) => `${V1}/careers/jobs/${jobId}/apply`,
    track: (applicationId: string) => `${V1}/careers/applications/${applicationId}`,
  },
  blog: {
    posts: `${V1}/blog/posts`,
    post: (slug: string) => `${V1}/blog/posts/${encodeURIComponent(slug)}`,
  },
  /** Public Loupe Scanner waitlist — join (checkout CTA) + social-proof stats. */
  waitlist: {
    join: `${V1}/waitlist`,
    stats: `${V1}/waitlist/stats`,
  },
  /** Public feature-flag map (no auth) — clients gate UI on this. */
  flags: `${V1}/flags`,
  /** Admin developer-portal surface (requires an admin user). */
  admin: {
    metrics: `${V1}/admin/metrics`,
    jobs: `${V1}/admin/jobs`,
    job: (id: string) => `${V1}/admin/jobs/${id}`,
    applications: `${V1}/admin/applications`,
    application: (id: string) => `${V1}/admin/applications/${id}`,
    applicationStatus: (id: string) => `${V1}/admin/applications/${id}/status`,
    blog: `${V1}/admin/blog`,
    blogPost: (id: string) => `${V1}/admin/blog/${id}`,
    users: `${V1}/admin/users`,
    userTest: `${V1}/admin/users/test`,
    userRole: (id: string) => `${V1}/admin/users/${id}/role`,
    userBan: (id: string) => `${V1}/admin/users/${id}/ban`,
    userUnban: (id: string) => `${V1}/admin/users/${id}/unban`,
    user: (id: string) => `${V1}/admin/users/${id}`,
    flags: `${V1}/admin/flags`,
    flag: (id: string) => `${V1}/admin/flags/${id}`,
    flagByKey: (key: string) => `${V1}/admin/flags/key/${encodeURIComponent(key)}`,
    waitlist: `${V1}/admin/waitlist`,
    waitlistStatus: (id: string) => `${V1}/admin/waitlist/${id}/status`,
    waitlistEntry: (id: string) => `${V1}/admin/waitlist/${id}`,
  },
} as const;
