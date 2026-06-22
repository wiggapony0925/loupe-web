/** HTTP path map for loupe-backend. Mirrors the routes in loupe-frontend. */
const V1 = "/v1";

export const ENDPOINTS = {
  system: { health: "/health", version: "/version" },
  auth: {
    login: `${V1}/auth/login`,
    register: `${V1}/auth/register`,
    devLogin: `${V1}/auth/dev-login`,
    google: `${V1}/auth/google`,
    apple: `${V1}/auth/apple`,
    refresh: `${V1}/auth/refresh`,
    logout: `${V1}/auth/logout`,
  },
  me: {
    root: `${V1}/me`,
    settings: `${V1}/me/settings`,
    entitlements: `${V1}/me/entitlements`,
    billingConfig: `${V1}/me/billing/config`,
    billingCheckout: `${V1}/me/billing/checkout`,
    billingPortal: `${V1}/me/billing/portal`,
  },
  home: { feed: `${V1}/home/feed` },
  analytics: { overview: `${V1}/analytics/overview` },
  /** Auto-generated monthly/yearly PDF portfolio statements. */
  reports: {
    list: `${V1}/reports`,
    upcoming: `${V1}/reports/upcoming`,
    create: `${V1}/reports`,
    item: (id: string) => `${V1}/reports/${id}`,
    download: (id: string) => `${V1}/reports/${id}/download`,
    file: (id: string) => `${V1}/reports/${id}/file`,
  },
  cards: {
    search: `${V1}/cards/search`,
    trending: `${V1}/cards/trending`,
    resolve: `${V1}/cards/resolve`,
    item: (id: string) => `${V1}/cards/${id}`,
    prices: (id: string, range?: string, house?: string, grade?: string) => {
      const q = new URLSearchParams();
      if (range) q.set("range", range);
      if (house) q.set("house", house);
      if (grade) q.set("grade", grade);
      const qs = q.toString();
      return `${V1}/cards/${id}/prices${qs ? `?${qs}` : ""}`;
    },
    market: (id: string) => `${V1}/cards/${id}/market`,
    canonical: (id: string) => `${V1}/cards/${id}/canonical`,
    marketplacePrices: (id: string) => `${V1}/cards/${id}/marketplace-prices`,
    valuation: (id: string) => `${V1}/cards/${id}/valuation`,
    listings: (id: string) => `${V1}/cards/${id}/listings`,
    nearbyListings: (
      id: string,
      coords?: { lat: number; lng: number; radiusKm?: number },
    ) => {
      const q = new URLSearchParams();
      if (coords) {
        q.set("lat", String(coords.lat));
        q.set("lng", String(coords.lng));
        if (coords.radiusKm) q.set("radius_km", String(coords.radiusKm));
      }
      const qs = q.toString();
      return `${V1}/cards/${id}/nearby-listings${qs ? `?${qs}` : ""}`;
    },
    comps: (id: string, opts?: { days?: number; grade?: string; house?: string }) => {
      const q = new URLSearchParams();
      if (opts?.days) q.set("days", String(opts.days));
      if (opts?.grade) q.set("grade", opts.grade);
      if (opts?.house) q.set("house", opts.house);
      const qs = q.toString();
      return `${V1}/cards/${id}/comps${qs ? `?${qs}` : ""}`;
    },
    gradeSummary: (id: string) => `${V1}/cards/${id}/grade-summary`,
    identify: `${V1}/cards/identify`,
  },
  /** Card sets — public catalog list + user-scoped completion progress. */
  sets: {
    list: (tcg?: string) => `${V1}/sets${tcg ? `?tcg=${tcg}` : ""}`,
    progress: `${V1}/sets/progress`,
  },
  /** Sealed-product catalog (public) + the user's sealed holdings (auth). */
  sealed: {
    search: (params: {
      q?: string;
      tcg?: string;
      product_type?: string;
      limit?: number;
      cursor?: number;
    }) => {
      const qs = new URLSearchParams();
      if (params.q) qs.set("q", params.q);
      if (params.tcg) qs.set("tcg", params.tcg);
      if (params.product_type) qs.set("product_type", params.product_type);
      if (params.limit) qs.set("limit", String(params.limit));
      if (params.cursor) qs.set("cursor", String(params.cursor));
      const s = qs.toString();
      return `${V1}/sealed/search${s ? `?${s}` : ""}`;
    },
    item: (id: string) => `${V1}/sealed/${id}`,
    market: (id: string) => `${V1}/sealed/${id}/market`,
  },
  sealedHoldings: {
    list: (params?: {
      include_opened?: boolean;
      sort?: string;
      limit?: number;
      cursor?: number;
    }) => {
      const qs = new URLSearchParams();
      if (params?.include_opened === false) qs.set("include_opened", "false");
      if (params?.sort) qs.set("sort", params.sort);
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.cursor) qs.set("cursor", String(params.cursor));
      const s = qs.toString();
      return `${V1}/sealed-holdings${s ? `?${s}` : ""}`;
    },
    create: `${V1}/sealed-holdings`,
    item: (id: string) => `${V1}/sealed-holdings/${id}`,
  },
  /** Public web storefront — server-side search/trending derivation. */
  public: {
    search: `${V1}/public/search`,
    trending: `${V1}/public/trending`,
    browse: `${V1}/public/browse`,
    sparklines: `${V1}/public/sparklines`,
  },
  grades: {
    mine: `${V1}/grades`,
    create: `${V1}/grades`,
    summary: `${V1}/grades/summary`,
    history: `${V1}/grades/history`,
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
  /** Price alerts — notify the user when a card crosses a threshold. */
  alerts: {
    list: `${V1}/alerts`,
    create: `${V1}/alerts`,
    remove: (id: string) => `${V1}/alerts/${id}`,
  },
  /** Public developer-portal surface — careers + blog. */
  careers: {
    jobs: `${V1}/careers/jobs`,
    job: (slug: string) => `${V1}/careers/jobs/${encodeURIComponent(slug)}`,
    apply: (jobId: string) => `${V1}/careers/jobs/${jobId}/apply`,
    track: (applicationId: string) =>
      `${V1}/careers/applications/${applicationId}`,
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
    userPlan: (id: string) => `${V1}/admin/users/${id}/plan`,
    userBan: (id: string) => `${V1}/admin/users/${id}/ban`,
    userUnban: (id: string) => `${V1}/admin/users/${id}/unban`,
    user: (id: string) => `${V1}/admin/users/${id}`,
    flags: `${V1}/admin/flags`,
    flag: (id: string) => `${V1}/admin/flags/${id}`,
    flagByKey: (key: string) =>
      `${V1}/admin/flags/key/${encodeURIComponent(key)}`,
    waitlist: `${V1}/admin/waitlist`,
    waitlistStatus: (id: string) => `${V1}/admin/waitlist/${id}/status`,
    waitlistEntry: (id: string) => `${V1}/admin/waitlist/${id}`,
  },
} as const;
