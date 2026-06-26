/**
 * The unified API surface. Every backend call lives here as one typed function,
 * grouped by domain. UI never builds URLs or maps payloads — it calls `api.x.y()`.
 */
import { apiFetch } from "./client";
import { ENDPOINTS } from "./endpoints";
import {
  canonicalToSummary,
  toCardAnalytics,
  toCardAttributes,
  toCardListings,
  toCardMarket,
  toCardOwnership,
  toCardSet,
  toCardSummary,
  toCardValuation,
  toMarketSnapshot,
  toMarketplaceQuotes,
  toNearbyListings,
  toPriceSeries,
  toSealedHolding,
  toSealedProduct,
  toSetProgress,
  toSoldComps,
  type ApiCard,
} from "./adapters";
import {
  applyToBody,
  blogPostToBody,
  jobPostingToBody,
  statusUpdateToBody,
  toAdminMetrics,
  toAdminUser,
  toAdminUserDetail,
  toAdminUserPage,
  toFeatureFlag,
  toApplicationSubmitted,
  toApplicationTrack,
  toBlogPost,
  toJobApplication,
  toJobApplicationDetail,
  toJobPosting,
  toWaitlistEntry,
  toWaitlistJoined,
  toWaitlistStats,
  waitlistJoinToBody,
} from "./portalAdapters";
import {
  toAdminCardDetail,
  toAdminCardPage,
  toAdminPriceSnapshot,
  toAuditPage,
  toCatalogCoverage,
  toCloudLogEntry,
  toCloudStatus,
  toDbGraph,
  toDbOverview,
  toDbTableDetail,
  toEngagementSummary,
  toGradeReviewPage,
  toHealthReport,
  toPulseFeed,
  toScannerStats,
} from "./opsAdapters";
import type {
  AdminMetrics,
  AdminUser,
  AdminUserDetail,
  AdminUserPage,
  AdminUsersParams,
  AdminCardDetail,
  AdminCardPage,
  AdminCardsParams,
  AdminPriceSnapshot,
  AuditFacets,
  AuditPage,
  AuditParams,
  CatalogCoverage,
  CloudLogEntry,
  PriceOverrideInput,
  RefundResult,
  ImpersonateResult,
  CloudStatus,
  DbGraph,
  DbOverview,
  DbTableDetail,
  EngagementSummary,
  GradeReviewPage,
  GradeReviewParams,
  HealthReport,
  InsightsAnswer,
  PulseFeed,
  RetentionReport,
  ScannerStats,
  AnalyticsOverview,
  ApplicationStatusUpdateInput,
  ApplicationSubmitted,
  ApplicationTrack,
  ApplyInput,
  Announcement,
  AnnouncementUpdate,
  AppleSignInRequest,
  ChangePasswordRequest,
  BillingConfig,
  BlogPost,
  BlogPostInput,
  PlanConfigUpdate,
  SiteConfig,
  CheckoutResult,
  Entitlements,
  PortalSession,
  Recents,
  RevenueSummary,
  SubscribeResult,
  GoogleSignInRequest,
  CardAnalytics,
  CardAttributes,
  CardOwnership,
  CardListing,
  CardMarket,
  CardSet,
  CardSparkline,
  CardSummary,
  MarketSnapshot,
  NearbyListing,
  PortfolioHistory,
  GenerateReportInput,
  ReportDownload,
  UpcomingReport,
  UserReport,
  CardValuation,
  SetProgressRow,
  SoldComp,
  ScanResult,
  CreateGradeInput,
  CreateAlertInput,
  PriceAlert,
  FeatureFlag,
  FeatureFlagCreateInput,
  FeatureFlagUpdateInput,
  FeatureFlagUpsertInput,
  FlagMap,
  TestAccount,
  GradedCard,
  GradesParams,
  HomeFeed,
  JobApplication,
  JobApplicationDetail,
  JobPosting,
  JobPostingInput,
  MarketplaceQuote,
  PriceSeries,
  PublicBrowseParams,
  PublicSearchParams,
  PublicTrendingParams,
  RawCondition,
  SealedHolding,
  SealedHoldingCreateInput,
  SealedHoldingsParams,
  SealedHoldingUpdateInput,
  SealedProduct,
  SealedMarket,
  SealedSearchParams,
  SearchPage,
  SignInRequest,
  SignUpRequest,
  LoginResult,
  MfaEnableResult,
  MfaSetup,
  MfaStatus,
  MfaVerifyRequest,
  TokenPair,
  UpdateGradeInput,
  User,
  WaitlistEntry,
  WaitlistJoinInput,
  WaitlistJoined,
  WaitlistStats,
  WaitlistStatus,
  WatchlistItem,
} from "./types";

interface RawIdentifyCandidate {
  card_id?: string | null;
  upstream_id?: string | null;
  name: string;
  set_name?: string | null;
  number?: string | null;
  image_url?: string | null;
  tcg?: string | null;
  confidence?: number;
}
interface RawIdentify {
  candidates?: RawIdentifyCandidate[];
  accuracy_score?: number;
}

/** Wire shapes for the reports API (snake_case from the backend). */
interface ReportWire {
  id: string;
  period: UserReport["period"];
  period_start: string;
  period_end: string;
  status: UserReport["status"];
  title: string;
  file_size_bytes: number | null;
  error_message: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}
interface UpcomingWire {
  period: UpcomingReport["period"];
  period_start: string;
  period_end: string;
  closes_at: string;
  label: string;
}
function toUserReport(w: ReportWire): UserReport {
  return {
    id: w.id,
    period: w.period,
    periodStart: w.period_start,
    periodEnd: w.period_end,
    status: w.status,
    title: w.title,
    fileSizeBytes: w.file_size_bytes,
    errorMessage: w.error_message,
    generatedAt: w.generated_at,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  };
}
function toUpcoming(w: UpcomingWire): UpcomingReport {
  return {
    period: w.period,
    periodStart: w.period_start,
    periodEnd: w.period_end,
    closesAt: w.closes_at,
    label: w.label,
  };
}

/** Wire shape for the admin revenue summary (snake_case). */
interface RevenueWire {
  billing_configured: boolean;
  currency: string;
  paying: number;
  trialing: number;
  comped: number;
  free: number;
  total_users: number;
  price_monthly_usd: number;
  price_yearly_usd: number;
  est_mrr_usd: number;
  est_arr_usd: number;
  new_pro_30d: number;
  churned_30d: number;
  churn_rate_30d: number;
  pro_by_month: Array<{ month: string; new_pro: number }>;
}
function toRevenueSummary(w: RevenueWire): RevenueSummary {
  return {
    billingConfigured: w.billing_configured,
    currency: w.currency,
    paying: w.paying,
    trialing: w.trialing,
    comped: w.comped,
    free: w.free,
    totalUsers: w.total_users,
    priceMonthlyUsd: w.price_monthly_usd,
    priceYearlyUsd: w.price_yearly_usd,
    estMrrUsd: w.est_mrr_usd,
    estArrUsd: w.est_arr_usd,
    newPro30d: w.new_pro_30d,
    churned30d: w.churned_30d,
    churnRate30d: w.churn_rate_30d,
    proByMonth: (w.pro_by_month ?? []).map((p) => ({
      month: p.month,
      newPro: p.new_pro,
    })),
  };
}

export const api = {
  cards: {
    /** Public trending cards. */
    trending: async (): Promise<CardSummary[]> => {
      const d = await apiFetch<{ cards: ApiCard[] }>(ENDPOINTS.cards.trending);
      return (d.cards ?? []).map(toCardSummary);
    },
    /** Public full-text search. */
    search: async (q: string): Promise<CardSummary[]> => {
      const d = await apiFetch<{ results: ApiCard[] }>(ENDPOINTS.cards.search, {
        query: { q },
      });
      return (d.results ?? []).map(toCardSummary);
    },
    /**
     * Public storefront search — the server does the filtering, sorting,
     * pagination, and faceting; the client just renders the page.
     */
    publicSearch: async (params: PublicSearchParams): Promise<SearchPage> => {
      const d = await apiFetch<{
        results: ApiCard[];
        total: number;
        page: number;
        page_size: number;
        facets: { rarities: string[]; sets: string[] };
      }>(ENDPOINTS.public.search, {
        query: {
          q: params.q ?? "",
          tcg: params.tcg ?? "all",
          rarity: params.rarity ?? undefined,
          set: params.set ?? undefined,
          sort: params.sort ?? "best",
          page: params.page ?? 1,
          page_size: params.pageSize ?? 12,
        },
      });
      return {
        results: (d.results ?? []).map(toCardSummary),
        total: d.total ?? 0,
        page: d.page ?? 1,
        pageSize: d.page_size ?? 12,
        facets: {
          rarities: d.facets?.rarities ?? [],
          sets: d.facets?.sets ?? [],
        },
      };
    },
    /** Browse a whole game catalog (thousands of cards, real server pagination). */
    publicBrowse: async (params: PublicBrowseParams): Promise<SearchPage> => {
      const d = await apiFetch<{
        cards: ApiCard[];
        total: number;
        page: number;
        page_size: number;
      }>(ENDPOINTS.public.browse, {
        query: {
          game: params.game ?? "pokemon",
          set: params.set ?? undefined,
          page: params.page ?? 1,
          page_size: params.pageSize ?? 24,
          sort: params.sort ?? "name",
        },
      });
      return {
        results: (d.cards ?? []).map(toCardSummary),
        total: d.total ?? 0,
        page: d.page ?? 1,
        pageSize: d.page_size ?? 24,
        facets: { rarities: [], sets: [] },
      };
    },
    /** Public trending with the cut applied server-side (value, price ceiling). */
    publicTrending: async (
      params: PublicTrendingParams = {},
    ): Promise<CardSummary[]> => {
      const d = await apiFetch<{ cards: ApiCard[] }>(
        ENDPOINTS.public.trending,
        {
          query: {
            tcg: params.tcg ?? "all",
            sort: params.sort ?? "trending",
            max_price: params.maxPrice ?? undefined,
            limit: params.limit ?? 20,
          },
        },
      );
      return (d.cards ?? []).map(toCardSummary);
    },
    /** Batch mini price series keyed by card id — for list-row sparklines. */
    sparklines: async (
      ids: string[],
      range = "7d",
    ): Promise<CardSparkline[]> => {
      if (ids.length === 0) return [];
      const d = await apiFetch<{
        sparklines?: Array<{
          card_id: string;
          points?: number[];
          change_pct?: number | null;
        }>;
      }>(ENDPOINTS.public.sparklines, {
        query: { ids: ids.join(","), range },
        skipAuth: true,
      });
      return (d.sparklines ?? []).map((s) => ({
        cardId: s.card_id,
        points: s.points ?? [],
        changePct: s.change_pct ?? null,
      }));
    },
    /** Public price history → series. `range` maps to a backend bucket
     *  (`7d|30d|90d|1y|all`); `all` walks back to the card's release year. */
    prices: async (
      id: string,
      range?: string,
      house?: string,
      grade?: string,
    ): Promise<PriceSeries> => {
      const d = await apiFetch<{
        currency?: string;
        points?: Array<{ price: number; ts?: string }>;
      }>(ENDPOINTS.cards.prices(id, range, house, grade));
      return toPriceSeries(d);
    },
    /** Public market snapshot (slim summary — buy box / price points). */
    market: async (id: string): Promise<CardMarket> => {
      const d = await apiFetch<{
        snapshot?: { summary?: Record<string, never> };
      }>(ENDPOINTS.cards.market(id));
      return toCardMarket(d);
    },
    /** Full market snapshot — houses × grades, history buckets, summary. */
    snapshot: async (id: string): Promise<MarketSnapshot | null> => {
      const d = await apiFetch<Parameters<typeof toMarketSnapshot>[0]>(
        ENDPOINTS.cards.market(id),
      );
      return toMarketSnapshot(d);
    },
    /** Recent sold comps. */
    comps: async (
      id: string,
      opts?: { days?: number; grade?: string; house?: string },
    ): Promise<SoldComp[]> => {
      const d = await apiFetch<Parameters<typeof toSoldComps>[0]>(
        ENDPOINTS.cards.comps(id, opts),
      );
      return toSoldComps(d);
    },
    /** Live for-sale listings. */
    listings: async (id: string): Promise<CardListing[]> => {
      const d = await apiFetch<Parameters<typeof toCardListings>[0]>(
        ENDPOINTS.cards.listings(id),
      );
      return toCardListings(d);
    },
    /** Nearby Facebook Marketplace listings (location-scoped). */
    nearbyListings: async (
      id: string,
      coords: { lat: number; lng: number; radiusKm?: number },
    ): Promise<NearbyListing[]> => {
      const d = await apiFetch<Parameters<typeof toNearbyListings>[0]>(
        ENDPOINTS.cards.nearbyListings(id, coords),
      );
      return toNearbyListings(d);
    },
    /** Per-game attributes (Pokédex stats + attacks/abilities / MTG oracle / YGO).
     *  Sourced from the basic card endpoint, whose `attributes` block is fully
     *  populated (the `/canonical` composition is not). */
    attributes: async (id: string): Promise<CardAttributes | null> => {
      const d = await apiFetch<Parameters<typeof toCardAttributes>[0]>(
        ENDPOINTS.cards.item(id),
        { skipAuth: true },
      );
      return toCardAttributes(d);
    },
    /** The signed-in user's ownership of this card (copies + cost/value/P-L). */
    ownership: async (id: string): Promise<CardOwnership> => {
      const d = await apiFetch<Parameters<typeof toCardOwnership>[0]>(
        ENDPOINTS.cards.ownership(id),
      );
      return toCardOwnership(d);
    },
    /** Derived market analytics (market cap, momentum, volatility, …). Public. */
    analytics: async (id: string): Promise<CardAnalytics> => {
      const d = await apiFetch<Parameters<typeof toCardAnalytics>[0]>(
        ENDPOINTS.cards.analytics(id),
        { skipAuth: true },
      );
      return toCardAnalytics(d);
    },
    /** Live lowest price per marketplace + buy/search links. */
    marketplacePrices: async (id: string): Promise<MarketplaceQuote[]> => {
      const d = await apiFetch<Parameters<typeof toMarketplaceQuotes>[0]>(
        ENDPOINTS.cards.marketplacePrices(id),
      );
      return toMarketplaceQuotes(d);
    },
    /** Loupe Value — equilibrium fair value + signals + per-grade ladder. */
    valuation: async (id: string): Promise<CardValuation> => {
      const d = await apiFetch<Parameters<typeof toCardValuation>[0]>(
        ENDPOINTS.cards.valuation(id),
      );
      return toCardValuation(d);
    },
    /** Identify a card from a photo (multipart upload) → ranked candidates. */
    identify: async (image: Blob, tcg?: string): Promise<ScanResult> => {
      const form = new FormData();
      form.append("image", image, "scan.jpg");
      if (tcg) form.append("tcg", tcg);
      const d = await apiFetch<RawIdentify>(ENDPOINTS.cards.identify, {
        method: "POST",
        form,
      });
      const candidates = (d.candidates ?? [])
        .map((c) => ({
          id: c.upstream_id ?? c.card_id ?? "",
          name: c.name,
          setName: c.set_name ?? undefined,
          number: c.number ?? undefined,
          imageUrl: c.image_url ?? undefined,
          tcg: c.tcg ?? undefined,
          confidence: typeof c.confidence === "number" ? c.confidence : 0,
        }))
        .filter((c) => c.id);
      return {
        candidates,
        accuracy: typeof d.accuracy_score === "number" ? d.accuracy_score : 0,
      };
    },
    /** Public canonical identity. */
    canonical: async (id: string): Promise<CardSummary> => {
      const d = await apiFetch<Parameters<typeof canonicalToSummary>[1]>(
        ENDPOINTS.cards.canonical(id),
      );
      return canonicalToSummary(id, d);
    },
    /** Resolve a composite/upstream id → a stable local card UUID (materializes it). */
    resolve: async (upstreamId: string): Promise<string | null> => {
      const d = await apiFetch<{ card_id: string | null }>(
        ENDPOINTS.cards.resolve,
        {
          method: "POST",
          json: { upstream_id: upstreamId, materialize: true },
          skipAuth: true,
        },
      );
      return d.card_id ?? null;
    },
  },
  sets: {
    /** Public catalog list of sets for a game (logos, counts, release dates). */
    list: async (tcg?: string): Promise<CardSet[]> => {
      const d = await apiFetch<{ results?: Parameters<typeof toCardSet>[0][] }>(
        ENDPOINTS.sets.list(tcg),
        { skipAuth: true },
      );
      return (d.results ?? []).map(toCardSet);
    },
    /** Per-set completion progress for the signed-in user. */
    progress: async (): Promise<SetProgressRow[]> => {
      const d = await apiFetch<Parameters<typeof toSetProgress>[0]>(
        ENDPOINTS.sets.progress,
      );
      return toSetProgress(d);
    },
  },
  /** Public sealed-product catalog (booster boxes, ETBs, tins, …). */
  sealed: {
    search: async (params: SealedSearchParams = {}): Promise<SealedProduct[]> => {
      const d = await apiFetch<Parameters<typeof toSealedProduct>[0][]>(
        ENDPOINTS.sealed.search({
          q: params.q,
          tcg: params.tcg,
          product_type: params.productType,
          limit: params.limit,
          cursor: params.cursor,
        }),
        { skipAuth: true },
      );
      return (d ?? []).map(toSealedProduct);
    },
    get: async (id: string): Promise<SealedProduct> => {
      const d = await apiFetch<Parameters<typeof toSealedProduct>[0]>(
        ENDPOINTS.sealed.item(id),
        { skipAuth: true },
      );
      return toSealedProduct(d);
    },
    market: async (id: string): Promise<SealedMarket> => {
      const d = await apiFetch<{
        product_id: string;
        currency: string;
        msrp_usd: string | number | null;
        market: number | null;
        low: number | null;
        mid: number | null;
        high: number | null;
        source: string | null;
        marketplace_url: string | null;
        points?: Array<{ ts: string; price: number }>;
      }>(ENDPOINTS.sealed.market(id), { skipAuth: true });
      const currency = d.currency || "USD";
      const msrp =
        d.msrp_usd != null ? { amount: Number(d.msrp_usd), currency } : null;
      return {
        productId: d.product_id,
        currency,
        msrp,
        market: d.market,
        low: d.low,
        mid: d.mid,
        high: d.high,
        source: d.source,
        marketplaceUrl: d.marketplace_url,
        points: d.points ?? [],
      };
    },
  },
  /** The signed-in user's owned sealed product (vault). */
  sealedHoldings: {
    list: async (params: SealedHoldingsParams = {}): Promise<SealedHolding[]> => {
      const d = await apiFetch<Parameters<typeof toSealedHolding>[0][]>(
        ENDPOINTS.sealedHoldings.list({
          include_opened: params.includeOpened,
          sort: params.sort,
          limit: params.limit,
          cursor: params.cursor,
        }),
      );
      return (d ?? []).map(toSealedHolding);
    },
    create: async (input: SealedHoldingCreateInput): Promise<SealedHolding> => {
      const d = await apiFetch<Parameters<typeof toSealedHolding>[0]>(
        ENDPOINTS.sealedHoldings.create,
        {
          method: "POST",
          json: {
            product_id: input.productId,
            quantity: input.quantity ?? 1,
            purchase_price_usd: input.purchasePriceUsd ?? undefined,
            purchase_date: input.purchaseDate ?? undefined,
            estimated_value_usd: input.estimatedValueUsd ?? undefined,
            notes: input.notes ?? undefined,
          },
        },
      );
      return toSealedHolding(d);
    },
    update: async (
      id: string,
      input: SealedHoldingUpdateInput,
    ): Promise<SealedHolding> => {
      const d = await apiFetch<Parameters<typeof toSealedHolding>[0]>(
        ENDPOINTS.sealedHoldings.item(id),
        {
          method: "PATCH",
          json: {
            quantity: input.quantity,
            purchase_price_usd: input.purchasePriceUsd,
            purchase_date: input.purchaseDate,
            estimated_value_usd: input.estimatedValueUsd,
            notes: input.notes,
            opened_at: input.openedAt,
          },
        },
      );
      return toSealedHolding(d);
    },
    remove: async (id: string): Promise<void> => {
      await apiFetch<null>(ENDPOINTS.sealedHoldings.item(id), {
        method: "DELETE",
      });
    },
  },
  auth: {
    /** Email + password sign-in. Returns tokens, or an MFA challenge when the
     *  account has two-factor enabled (complete it via {@link mfaVerify}). */
    login: (body: SignInRequest) =>
      apiFetch<LoginResult>(ENDPOINTS.auth.login, {
        method: "POST",
        json: body,
        skipAuth: true,
      }),
    /** Email + password sign-up → TokenPair. */
    register: (body: SignUpRequest) =>
      apiFetch<TokenPair>(ENDPOINTS.auth.register, {
        method: "POST",
        json: body,
        skipAuth: true,
      }),
    /** Passwordless dev login (email only) → TokenPair. */
    devLogin: (body: { email: string; display_name?: string }) =>
      apiFetch<TokenPair>(ENDPOINTS.auth.devLogin, {
        method: "POST",
        json: body,
        skipAuth: true,
      }),
    /** Google sign-in — exchanges a Google ID token for a Loupe TokenPair. */
    google: (body: GoogleSignInRequest) =>
      apiFetch<TokenPair>(ENDPOINTS.auth.google, {
        method: "POST",
        json: body,
        skipAuth: true,
      }),
    /** Apple sign-in — exchanges an Apple identity token for a Loupe TokenPair. */
    apple: (body: AppleSignInRequest) =>
      apiFetch<TokenPair>(ENDPOINTS.auth.apple, {
        method: "POST",
        json: body,
        skipAuth: true,
      }),
    /** Clear the server-set HttpOnly auth cookie (web sign-out). */
    logout: () =>
      apiFetch<null>(ENDPOINTS.auth.logout, { method: "POST" }),
    /** Sign out everywhere: revoke every outstanding access + refresh token for
     *  the current user across all devices (bumps the server-side token epoch).
     *  Requires the current token, so call it before clearing local session. */
    logoutAll: () =>
      apiFetch<null>(ENDPOINTS.auth.logoutAll, { method: "POST" }),
    /** Change password: verifies the current one, sets the new one, and revokes
     *  every OTHER session. Returns a fresh TokenPair for the current device. */
    changePassword: (body: ChangePasswordRequest) =>
      apiFetch<TokenPair>(ENDPOINTS.auth.changePassword, { method: "POST", json: body }),
    /** Complete a 2FA sign-in: exchange the login challenge + a code for tokens. */
    mfaVerify: (body: MfaVerifyRequest) =>
      apiFetch<TokenPair>(ENDPOINTS.auth.mfaVerify, {
        method: "POST",
        json: body,
        skipAuth: true,
      }),
    /** Begin 2FA enrollment — returns a secret + QR (requires auth). */
    mfaSetup: () =>
      apiFetch<MfaSetup>(ENDPOINTS.auth.mfaSetup, { method: "POST" }),
    /** Confirm enrollment with a live code; returns one-time backup codes. */
    mfaEnable: (code: string) =>
      apiFetch<MfaEnableResult>(ENDPOINTS.auth.mfaEnable, {
        method: "POST",
        json: { code },
      }),
    /** Disable 2FA after re-verifying a code. */
    mfaDisable: (code: string) =>
      apiFetch<null>(ENDPOINTS.auth.mfaDisable, {
        method: "POST",
        json: { code },
      }),
    /** Whether the signed-in user currently has 2FA enabled. */
    mfaStatus: () =>
      apiFetch<MfaStatus>(ENDPOINTS.auth.mfaStatus),
  },
  me: {
    /** Current authenticated user. */
    get: () => apiFetch<User>(ENDPOINTS.me.root),
    /** Effective Loupe Pro entitlements (plan, limits, feature gates). */
    entitlements: () => apiFetch<Entitlements>(ENDPOINTS.me.entitlements),
    /** Pricing + whether real Stripe checkout is live yet. */
    billingConfig: () => apiFetch<BillingConfig>(ENDPOINTS.me.billingConfig),
    /** Begin a hosted Pro checkout (redirect) for the chosen interval. */
    startCheckout: (interval: "monthly" | "yearly") =>
      apiFetch<CheckoutResult>(ENDPOINTS.me.billingCheckout, {
        method: "POST",
        json: { interval },
      }),
    /** Create a subscription for the in-app Payment Element (returns a
     *  client secret to confirm). */
    subscribe: (interval: "monthly" | "yearly") =>
      apiFetch<SubscribeResult>(ENDPOINTS.me.billingSubscribe, {
        method: "POST",
        json: { interval },
      }),
    /** Open the Stripe customer portal (manage / cancel an active plan). */
    billingPortal: () =>
      apiFetch<PortalSession>(ENDPOINTS.me.billingPortal, { method: "POST" }),
    /** Cross-device recents (searches + recently-viewed). */
    recents: () => apiFetch<Recents>(ENDPOINTS.me.recents),
    /** Replace recents with the client's merged + capped list. */
    putRecents: (payload: Recents) =>
      apiFetch<Recents>(ENDPOINTS.me.recents, { method: "PUT", json: payload }),
  },
  analytics: {
    /** Whole-portfolio analytics in one round-trip (stats, movers, distributions). */
    overview: () => apiFetch<AnalyticsOverview>(ENDPOINTS.analytics.overview),
  },
  home: {
    /** Authenticated home feed — top movers + recent scans. */
    feed: (params?: { topMovers?: number; recentScans?: number }) =>
      apiFetch<HomeFeed>(ENDPOINTS.home.feed, {
        query: {
          topMovers: params?.topMovers,
          recentScans: params?.recentScans,
        },
      }),
  },

  /** Monthly/yearly PDF portfolio statements (Amex-style auto-archive). */
  reports: {
    list: async (): Promise<UserReport[]> => {
      const d = await apiFetch<ReportWire[]>(ENDPOINTS.reports.list);
      return d.map(toUserReport);
    },
    upcoming: async (): Promise<UpcomingReport[]> => {
      const d = await apiFetch<UpcomingWire[]>(ENDPOINTS.reports.upcoming);
      return d.map(toUpcoming);
    },
    create: async (input: GenerateReportInput): Promise<UserReport> => {
      const d = await apiFetch<ReportWire>(ENDPOINTS.reports.create, {
        method: "POST",
        json: input,
      });
      return toUserReport(d);
    },
    /** Presigned download URL (or null → stream from the file endpoint). */
    downloadUrl: async (id: string): Promise<ReportDownload> => {
      const d = await apiFetch<{
        download_url: string | null;
        expires_in_seconds: number;
      }>(ENDPOINTS.reports.download(id));
      return {
        downloadUrl: d.download_url,
        expiresInSeconds: d.expires_in_seconds,
      };
    },
  },
  watchlist: {
    /** The signed-in user's pinned cards. */
    list: async (): Promise<WatchlistItem[]> => {
      const rows = await apiFetch<RawWatchlistItem[]>(ENDPOINTS.watchlist.list);
      return (rows ?? []).map(toWatchlistItem);
    },
    /** Pin a card by its local UUID. */
    add: async (cardId: string): Promise<WatchlistItem> => {
      const row = await apiFetch<RawWatchlistItem>(ENDPOINTS.watchlist.add, {
        method: "POST",
        json: { card_id: cardId },
      });
      return toWatchlistItem(row);
    },
    /** Unpin by local UUID. */
    remove: (cardId: string) =>
      apiFetch<void>(ENDPOINTS.watchlist.remove(cardId), { method: "DELETE" }),
    /**
     * Pin a public (composite-id) card: resolve it to a local UUID first, then
     * pin. This is what the storefront's "Add to watchlist" calls.
     */
    addByUpstream: async (upstreamId: string): Promise<WatchlistItem> => {
      const cardId = await api.cards.resolve(upstreamId);
      if (!cardId) throw new Error("Could not resolve this card");
      return api.watchlist.add(cardId);
    },
  },
  grades: {
    /** The signed-in user's graded/owned cards (the Vault). */
    list: async (params: GradesParams = {}): Promise<GradedCard[]> => {
      const rows = await apiFetch<RawGrade[]>(ENDPOINTS.grades.mine, {
        query: {
          sort: params.sort ?? "value_desc",
          limit: params.limit ?? 60,
          cursor: params.cursor,
          house: params.house,
        },
      });
      return (rows ?? []).map(toGradedCard);
    },
    /** Collection value over time (for the dashboard portfolio chart). */
    history: async (range = "1Y"): Promise<PortfolioHistory> => {
      const d = await apiFetch<{
        range?: string;
        points?: Array<{ date: string; priceUsd?: number; price_usd?: number }>;
        deltaUsd?: number;
        delta_usd?: number;
        deltaPct?: number;
        delta_pct?: number;
      }>(ENDPOINTS.grades.history, { query: { range } });
      return {
        range: d.range ?? range,
        points: (d.points ?? []).map((p) => ({
          date: p.date,
          priceUsd: p.priceUsd ?? p.price_usd ?? 0,
        })),
        deltaUsd: d.deltaUsd ?? d.delta_usd ?? 0,
        deltaPct: d.deltaPct ?? d.delta_pct ?? 0,
      };
    },
    /** Add a card to the collection (vault). Accepts a public composite
     *  `upstreamId` directly — the backend materializes the local card. */
    create: async (input: CreateGradeInput): Promise<GradedCard> => {
      const body: Record<string, unknown> = {
        grade: input.grade,
        house: input.house,
      };
      if (input.cardId) body.card_id = input.cardId;
      if (input.upstreamId) body.upstream_id = input.upstreamId;
      if (input.condition != null) body.condition = input.condition;
      if (input.purchasePriceUsd != null)
        body.purchase_price_usd = input.purchasePriceUsd;
      if (input.purchaseDate) body.purchase_date = input.purchaseDate;
      if (input.estimatedValueUsd != null)
        body.estimated_value_usd = input.estimatedValueUsd;
      if (input.notes) body.notes = input.notes;
      const row = await apiFetch<RawGrade>(ENDPOINTS.grades.create, {
        method: "POST",
        json: body,
      });
      return toGradedCard(row);
    },
    /** Edit a holding (grade, house, condition, cost basis, value, notes).
     *  `undefined` fields are omitted; `null` clears a value server-side. */
    update: async ({ id, ...rest }: UpdateGradeInput): Promise<GradedCard> => {
      const body: Record<string, unknown> = {};
      if (rest.grade !== undefined) body.grade = rest.grade;
      if (rest.house !== undefined) body.house = rest.house;
      if (rest.condition !== undefined) body.condition = rest.condition;
      if (rest.purchasePriceUsd !== undefined)
        body.purchase_price_usd = rest.purchasePriceUsd;
      if (rest.purchaseDate !== undefined)
        body.purchase_date = rest.purchaseDate;
      if (rest.estimatedValueUsd !== undefined)
        body.estimated_value_usd = rest.estimatedValueUsd;
      if (rest.notes !== undefined) body.notes = rest.notes;
      const row = await apiFetch<RawGrade>(ENDPOINTS.grades.item(id), {
        method: "PATCH",
        json: body,
      });
      return toGradedCard(row);
    },
    /** Soft-delete a holding. The card stays in the catalog. */
    remove: (id: string) =>
      apiFetch<void>(ENDPOINTS.grades.item(id), { method: "DELETE" }),
  },
  /** Price alerts — notify the user when a card crosses a price threshold. */
  alerts: {
    /** The signed-in user's alerts, newest first. `pending` hides fired ones. */
    list: async (pending = false): Promise<PriceAlert[]> => {
      const rows = await apiFetch<RawPriceAlert[]>(ENDPOINTS.alerts.list, {
        query: { pending: pending || undefined },
      });
      return (rows ?? []).map(toPriceAlert);
    },
    /** Create an alert. Accepts a public composite `upstreamId` directly — the
     *  backend materializes the local card (mobile may pass a `cardId`). */
    create: async (input: CreateAlertInput): Promise<PriceAlert> => {
      const body: Record<string, unknown> = {
        condition: input.condition,
        threshold_usd: input.thresholdUsd,
      };
      if (input.cardId) body.card_id = input.cardId;
      if (input.upstreamId) body.upstream_id = input.upstreamId;
      if (input.note) body.note = input.note;
      const row = await apiFetch<RawPriceAlert>(ENDPOINTS.alerts.create, {
        method: "POST",
        json: body,
      });
      return toPriceAlert(row);
    },
    /** Delete an alert by id. */
    remove: (id: string) =>
      apiFetch<void>(ENDPOINTS.alerts.remove(id), { method: "DELETE" }),
  },
  /** Public careers surface — browse open roles, apply, track. */
  careers: {
    jobs: async (): Promise<JobPosting[]> => {
      const rows = await apiFetch<Parameters<typeof toJobPosting>[0][]>(
        ENDPOINTS.careers.jobs,
        { skipAuth: true },
      );
      return (rows ?? []).map(toJobPosting);
    },
    job: async (slug: string): Promise<JobPosting> =>
      toJobPosting(
        await apiFetch(ENDPOINTS.careers.job(slug), { skipAuth: true }),
      ),
    apply: async (
      jobId: string,
      input: ApplyInput,
    ): Promise<ApplicationSubmitted> =>
      toApplicationSubmitted(
        await apiFetch(ENDPOINTS.careers.apply(jobId), {
          method: "POST",
          json: applyToBody(input),
          skipAuth: true,
        }),
      ),
    track: async (
      applicationId: string,
      email: string,
    ): Promise<ApplicationTrack> =>
      toApplicationTrack(
        await apiFetch(ENDPOINTS.careers.track(applicationId), {
          query: { email },
          skipAuth: true,
        }),
      ),
  },
  /** Public blog surface — published posts only. */
  blog: {
    posts: async (): Promise<BlogPost[]> => {
      const rows = await apiFetch<Parameters<typeof toBlogPost>[0][]>(
        ENDPOINTS.blog.posts,
        { skipAuth: true },
      );
      return (rows ?? []).map(toBlogPost);
    },
    post: async (slug: string): Promise<BlogPost> =>
      toBlogPost(await apiFetch(ENDPOINTS.blog.post(slug), { skipAuth: true })),
  },
  /** Public Loupe Scanner waitlist — join (the checkout CTA) + social-proof stats. */
  waitlist: {
    // No skipAuth: anonymous visitors omit the token, signed-in visitors
    // attach it so the backend can link the signup to their account.
    join: async (input: WaitlistJoinInput): Promise<WaitlistJoined> =>
      toWaitlistJoined(
        await apiFetch(ENDPOINTS.waitlist.join, {
          method: "POST",
          json: waitlistJoinToBody(input),
        }),
      ),
    stats: async (): Promise<WaitlistStats> =>
      toWaitlistStats(
        await apiFetch(ENDPOINTS.waitlist.stats, { skipAuth: true }),
      ),
  },
  /** Public feature-flag map — `{key: enabled}`. No auth (web + mobile gate on it). */
  flags: async (): Promise<FlagMap> =>
    (await apiFetch<FlagMap>(ENDPOINTS.flags, { skipAuth: true })) ?? {},
  /** Public global announcement banner (no auth). */
  announcement: (): Promise<Announcement> =>
    apiFetch<Announcement>(ENDPOINTS.announcement, { skipAuth: true }),
  /** Admin developer-portal surface (requires an admin user). */
  admin: {
    /** At-a-glance portal metrics. */
    metrics: async (): Promise<AdminMetrics> =>
      toAdminMetrics(await apiFetch(ENDPOINTS.admin.metrics)),
    /** Subscription revenue analytics (counts, est. MRR/ARR, churn, trend). */
    revenue: async (): Promise<RevenueSummary> =>
      toRevenueSummary(await apiFetch(ENDPOINTS.admin.revenue)),
    /** Catalog coverage by game (cards/sets, pHash %, price sources). */
    catalog: async (): Promise<CatalogCoverage> =>
      toCatalogCoverage(await apiFetch(ENDPOINTS.admin.catalog)),
    /** Grade-review queue — QA of graded cards (Loupe first-party by default). */
    gradeReview: async (params?: GradeReviewParams): Promise<GradeReviewPage> =>
      toGradeReviewPage(
        await apiFetch(ENDPOINTS.admin.gradeReview, {
          query: {
            house: params?.house,
            page: params?.page,
            page_size: params?.pageSize,
          },
        }),
      ),
    /** Live activity feed — recent signups, scans, acquisitions, admin actions. */
    pulse: async (limit = 40): Promise<PulseFeed> =>
      toPulseFeed(await apiFetch(ENDPOINTS.admin.pulse, { query: { limit } })),
    /** Engagement & retention — active collectors, activation, Pro funnel. */
    engagement: async (): Promise<EngagementSummary> =>
      toEngagementSummary(await apiFetch(ENDPOINTS.admin.engagement)),
    /** Cohort-retention triangle (field names already match — no adapter). */
    retention: (): Promise<RetentionReport> =>
      apiFetch<RetentionReport>(ENDPOINTS.admin.retention),
    /** "Ask your data" — natural-language → read-only SQL (super-admin). */
    insights: {
      status: (): Promise<{ configured: boolean }> =>
        apiFetch<{ configured: boolean }>(ENDPOINTS.admin.insightsStatus),
      ask: async (question: string): Promise<InsightsAnswer> => {
        const r = await apiFetch<{
          configured: boolean;
          question: string;
          sql: string | null;
          columns: string[];
          rows: Record<string, unknown>[];
          row_count: number;
          truncated: boolean;
          error: string | null;
        }>(ENDPOINTS.admin.insightsAsk, { method: "POST", json: { question } });
        return {
          configured: r.configured,
          question: r.question,
          sql: r.sql,
          columns: r.columns ?? [],
          rows: r.rows ?? [],
          rowCount: r.row_count,
          truncated: r.truncated,
          error: r.error,
        };
      },
    },
    /** Scan + identify funnel metrics over the last `days` days. */
    scanner: async (days = 30): Promise<ScannerStats> =>
      toScannerStats(
        await apiFetch(ENDPOINTS.admin.scanner, { query: { days } }),
      ),
    /** Card explorer — search the local catalog, inspect, override a price. */
    cards: {
      search: async (params?: AdminCardsParams): Promise<AdminCardPage> =>
        toAdminCardPage(
          await apiFetch(ENDPOINTS.admin.cards, {
            query: { q: params?.q, page: params?.page, page_size: params?.pageSize },
          }),
        ),
      get: async (id: string): Promise<AdminCardDetail> =>
        toAdminCardDetail(await apiFetch(ENDPOINTS.admin.card(id))),
      /** Record a manual price override (super-admin). */
      addPrice: async (
        id: string,
        input: PriceOverrideInput,
      ): Promise<AdminPriceSnapshot> =>
        toAdminPriceSnapshot(
          await apiFetch(ENDPOINTS.admin.cardPrice(id), {
            method: "POST",
            json: {
              house: input.house,
              grade: input.grade,
              price_usd: input.priceUsd,
              sale_date: input.saleDate ?? undefined,
            },
          }),
        ),
    },
    /** Operations — read-only observability (health, DB, cloud, audit). */
    ops: {
      health: async (): Promise<HealthReport> =>
        toHealthReport(await apiFetch(ENDPOINTS.admin.health)),
      database: {
        tables: async (): Promise<DbOverview> =>
          toDbOverview(await apiFetch(ENDPOINTS.admin.dbTables)),
        table: async (name: string): Promise<DbTableDetail> =>
          toDbTableDetail(await apiFetch(ENDPOINTS.admin.dbTable(name))),
        graph: async (): Promise<DbGraph> =>
          toDbGraph(await apiFetch(ENDPOINTS.admin.dbGraph)),
      },
      cloud: {
        status: async (): Promise<CloudStatus> =>
          toCloudStatus(await apiFetch(ENDPOINTS.admin.cloud)),
        logs: async (limit?: number): Promise<CloudLogEntry[]> => {
          const rows = await apiFetch<Parameters<typeof toCloudLogEntry>[0][]>(
            ENDPOINTS.admin.cloudLogs,
            { query: { limit } },
          );
          return (rows ?? []).map(toCloudLogEntry);
        },
      },
      audit: {
        list: async (params?: AuditParams): Promise<AuditPage> =>
          toAuditPage(
            await apiFetch(ENDPOINTS.admin.audit, {
              query: {
                action: params?.action,
                target_table: params?.targetTable,
                actor: params?.actor,
                page: params?.page,
                page_size: params?.pageSize,
              },
            }),
          ),
        facets: (): Promise<AuditFacets> =>
          apiFetch<AuditFacets>(ENDPOINTS.admin.auditFacets),
      },
    },
    /** Live site config — the Pro plan shape + announcement banner. */
    config: {
      get: (): Promise<SiteConfig> => apiFetch<SiteConfig>(ENDPOINTS.admin.config),
      updatePlan: (input: PlanConfigUpdate): Promise<SiteConfig> =>
        apiFetch<SiteConfig>(ENDPOINTS.admin.configPlan, {
          method: "PATCH",
          json: input,
        }),
      updateAnnouncement: (input: AnnouncementUpdate): Promise<SiteConfig> =>
        apiFetch<SiteConfig>(ENDPOINTS.admin.configAnnouncement, {
          method: "PATCH",
          json: input,
        }),
    },
    users: {
      list: async (params?: AdminUsersParams): Promise<AdminUserPage> =>
        toAdminUserPage(
          await apiFetch(ENDPOINTS.admin.users, {
            query: {
              q: params?.q,
              page: params?.page,
              page_size: params?.pageSize,
            },
          }),
        ),
      get: async (id: string): Promise<AdminUserDetail> =>
        toAdminUserDetail(await apiFetch(ENDPOINTS.admin.user(id))),
      createTest: async (): Promise<TestAccount> =>
        apiFetch<TestAccount>(ENDPOINTS.admin.userTest, { method: "POST" }),
      setRole: async (id: string, isAdmin: boolean): Promise<AdminUser> =>
        toAdminUser(
          await apiFetch(ENDPOINTS.admin.userRole(id), {
            method: "PATCH",
            json: { is_admin: isAdmin },
          }),
        ),
      /** Comp a user to Loupe Pro (or back to free) — testing before Stripe. */
      setPlan: async (id: string, plan: "free" | "pro"): Promise<AdminUser> =>
        toAdminUser(
          await apiFetch(ENDPOINTS.admin.userPlan(id), {
            method: "PATCH",
            json: { plan },
          }),
        ),
      ban: async (id: string, reason?: string | null): Promise<AdminUser> =>
        toAdminUser(
          await apiFetch(ENDPOINTS.admin.userBan(id), {
            method: "POST",
            json: { reason: reason ?? null },
          }),
        ),
      unban: async (id: string): Promise<AdminUser> =>
        toAdminUser(
          await apiFetch(ENDPOINTS.admin.userUnban(id), { method: "POST" }),
        ),
      remove: (id: string) =>
        apiFetch<void>(ENDPOINTS.admin.user(id), { method: "DELETE" }),
      /** Sign a user out of every device (revoke all outstanding tokens). */
      revokeSessions: async (id: string): Promise<AdminUserDetail> =>
        toAdminUserDetail(
          await apiFetch(ENDPOINTS.admin.userRevokeSessions(id), {
            method: "POST",
          }),
        ),
      /** Cancel a user's Stripe subscription (super-admin). Default = end of
       *  period (keeps Pro until it lapses); `immediately` ends it now. */
      cancelSubscription: async (
        id: string,
        immediately = false,
      ): Promise<AdminUserDetail> =>
        toAdminUserDetail(
          await apiFetch(ENDPOINTS.admin.userCancelSubscription(id), {
            method: "POST",
            json: { immediately },
          }),
        ),
      /** Mint a short-lived token to view the app as this user (super-admin). */
      impersonate: async (id: string): Promise<ImpersonateResult> => {
        const r = await apiFetch<{
          token: string;
          email: string;
          expires_in: number;
        }>(ENDPOINTS.admin.userImpersonate(id), { method: "POST" });
        return { token: r.token, email: r.email, expiresIn: r.expires_in };
      },
      /** Refund a user's latest charge (super-admin, money-out). */
      refundLatest: async (id: string): Promise<RefundResult> => {
        const r = await apiFetch<{
          refund_id: string;
          charge_id: string;
          amount_usd: number;
          currency: string;
          status: string;
        }>(ENDPOINTS.admin.userRefund(id), { method: "POST" });
        return {
          refundId: r.refund_id,
          chargeId: r.charge_id,
          amountUsd: r.amount_usd,
          currency: r.currency,
          status: r.status,
        };
      },
    },
    flags: {
      list: async (): Promise<FeatureFlag[]> => {
        const rows = await apiFetch<Parameters<typeof toFeatureFlag>[0][]>(
          ENDPOINTS.admin.flags,
        );
        return (rows ?? []).map(toFeatureFlag);
      },
      create: async (input: FeatureFlagCreateInput): Promise<FeatureFlag> =>
        toFeatureFlag(
          await apiFetch(ENDPOINTS.admin.flags, {
            method: "POST",
            json: input,
          }),
        ),
      update: async (
        id: string,
        input: FeatureFlagUpdateInput,
      ): Promise<FeatureFlag> =>
        toFeatureFlag(
          await apiFetch(ENDPOINTS.admin.flag(id), {
            method: "PATCH",
            json: input,
          }),
        ),
      /** Set a flag's enabled state by key, creating it if missing (inspect overlay). */
      upsertByKey: async (
        key: string,
        input: FeatureFlagUpsertInput,
      ): Promise<FeatureFlag> =>
        toFeatureFlag(
          await apiFetch(ENDPOINTS.admin.flagByKey(key), {
            method: "PUT",
            json: input,
          }),
        ),
      remove: (id: string) =>
        apiFetch<void>(ENDPOINTS.admin.flag(id), { method: "DELETE" }),
    },
    jobs: {
      list: async (): Promise<JobPosting[]> => {
        const rows = await apiFetch<Parameters<typeof toJobPosting>[0][]>(
          ENDPOINTS.admin.jobs,
        );
        return (rows ?? []).map(toJobPosting);
      },
      create: async (input: JobPostingInput): Promise<JobPosting> =>
        toJobPosting(
          await apiFetch(ENDPOINTS.admin.jobs, {
            method: "POST",
            json: jobPostingToBody(input),
          }),
        ),
      update: async (id: string, input: JobPostingInput): Promise<JobPosting> =>
        toJobPosting(
          await apiFetch(ENDPOINTS.admin.job(id), {
            method: "PATCH",
            json: jobPostingToBody(input),
          }),
        ),
      remove: (id: string) =>
        apiFetch<void>(ENDPOINTS.admin.job(id), { method: "DELETE" }),
    },
    applications: {
      list: async (params?: {
        jobId?: string;
        status?: string;
      }): Promise<JobApplication[]> => {
        const rows = await apiFetch<Parameters<typeof toJobApplication>[0][]>(
          ENDPOINTS.admin.applications,
          {
            query: { job_id: params?.jobId, status: params?.status },
          },
        );
        return (rows ?? []).map(toJobApplication);
      },
      get: async (id: string): Promise<JobApplicationDetail> =>
        toJobApplicationDetail(await apiFetch(ENDPOINTS.admin.application(id))),
      updateStatus: async (
        id: string,
        input: ApplicationStatusUpdateInput,
      ): Promise<JobApplicationDetail> =>
        toJobApplicationDetail(
          await apiFetch(ENDPOINTS.admin.applicationStatus(id), {
            method: "PATCH",
            json: statusUpdateToBody(input),
          }),
        ),
    },
    blog: {
      list: async (): Promise<BlogPost[]> => {
        const rows = await apiFetch<Parameters<typeof toBlogPost>[0][]>(
          ENDPOINTS.admin.blog,
        );
        return (rows ?? []).map(toBlogPost);
      },
      create: async (input: BlogPostInput): Promise<BlogPost> =>
        toBlogPost(
          await apiFetch(ENDPOINTS.admin.blog, {
            method: "POST",
            json: blogPostToBody(input),
          }),
        ),
      update: async (id: string, input: BlogPostInput): Promise<BlogPost> =>
        toBlogPost(
          await apiFetch(ENDPOINTS.admin.blogPost(id), {
            method: "PATCH",
            json: blogPostToBody(input),
          }),
        ),
      remove: (id: string) =>
        apiFetch<void>(ENDPOINTS.admin.blogPost(id), { method: "DELETE" }),
    },
    waitlist: {
      list: async (params?: {
        status?: WaitlistStatus;
      }): Promise<WaitlistEntry[]> => {
        const rows = await apiFetch<Parameters<typeof toWaitlistEntry>[0][]>(
          ENDPOINTS.admin.waitlist,
          {
            query: { status: params?.status },
          },
        );
        return (rows ?? []).map(toWaitlistEntry);
      },
      setStatus: async (
        id: string,
        status: WaitlistStatus,
      ): Promise<WaitlistEntry> =>
        toWaitlistEntry(
          await apiFetch(ENDPOINTS.admin.waitlistStatus(id), {
            method: "PATCH",
            json: { status },
          }),
        ),
      remove: (id: string) =>
        apiFetch<void>(ENDPOINTS.admin.waitlistEntry(id), { method: "DELETE" }),
    },
  },
} as const;

interface RawWatchlistItem {
  id: string;
  card_id: string;
  card_name?: string | null;
  card_image_url?: string | null;
}

function toWatchlistItem(r: RawWatchlistItem): WatchlistItem {
  return {
    id: r.id,
    cardId: r.card_id,
    cardName: r.card_name ?? undefined,
    cardImageUrl: r.card_image_url ?? undefined,
  };
}

interface RawGrade {
  id: string;
  card_id: string;
  grade: string | number;
  house: string;
  condition?: string | null;
  estimated_value_usd?: string | number | null;
  purchase_price_usd?: string | number | null;
  purchase_date?: string | null;
  notes?: string | null;
  card_name?: string | null;
  card_image_url?: string | null;
  card_set_name?: string | null;
  card_number?: string | null;
  /** Total graded copies of this card the user owns (defaults to 1). */
  copies_owned?: number | null;
}

/** Backend serializes Decimals as strings — coerce to a finite number or undefined. */
function num(v: string | number | null | undefined): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function toGradedCard(r: RawGrade): GradedCard {
  return {
    id: r.id,
    cardId: r.card_id,
    cardName: r.card_name ?? undefined,
    cardImageUrl: r.card_image_url ?? undefined,
    cardSetName: r.card_set_name ?? undefined,
    cardNumber: r.card_number ?? undefined,
    grade: num(r.grade) ?? 0,
    house: r.house,
    condition: (r.condition as RawCondition | null) ?? null,
    estimatedValueUsd: num(r.estimated_value_usd),
    purchasePriceUsd: num(r.purchase_price_usd),
    purchaseDate: r.purchase_date ?? null,
    notes: r.notes ?? null,
    copies: r.copies_owned ?? undefined,
  };
}

interface RawPriceAlert {
  id: string;
  card_id: string;
  condition: "above" | "below";
  threshold_usd: string | number;
  note?: string | null;
  created_at: string;
  triggered_at?: string | null;
  triggered_price_usd?: string | number | null;
  card_name?: string | null;
  card_image_url?: string | null;
}

function toPriceAlert(r: RawPriceAlert): PriceAlert {
  return {
    id: r.id,
    cardId: r.card_id,
    condition: r.condition,
    thresholdUsd: num(r.threshold_usd) ?? 0,
    note: r.note ?? null,
    createdAt: r.created_at,
    triggeredAt: r.triggered_at ?? null,
    triggeredPriceUsd: num(r.triggered_price_usd) ?? null,
    cardName: r.card_name ?? null,
    cardImageUrl: r.card_image_url ?? null,
  };
}
