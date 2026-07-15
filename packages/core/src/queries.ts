/**
 * The reusable hook layer. `useApiQuery` / `useApiMutation` are thin, typed
 * wrappers over React Query so any endpoint becomes a one-line hook; the domain
 * hooks below are built on them and shared across web + mobile.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { api } from "./api";
import { ApiError } from "./client";
import type {
  AdminMetrics,
  AdminUser,
  AdminUserDetail,
  AdminUserPage,
  AdminUsersParams,
  RefundResult,
  ImpersonateResult,
  AuditFacets,
  AuditPage,
  AuditParams,
  CloudLogEntry,
  CloudStatus,
  DbGraph,
  DbOverview,
  DbTableDetail,
  AnnouncementDraft,
  AnnouncementSendResult,
  SupportDraft,
  SupportSendResult,
  EmailLogDetail,
  EmailLogPage,
  EmailLogParams,
  EmailTemplateRender,
  EmailTemplatesReport,
  EmailTestResult,
  EnvReport,
  IntegrationsReport,
  HealthReport,
  PriceChartingOverview,
  PriceChartingSyncResult,
  RevenueSummary,
  CardTree,
  CatalogCoverage,
  ScannerStats,
  ScannerTrend,
  ScanHistoryPage,
  ScanHistoryDetail,
  ScanHistoryQuery,
  GradeReviewPage,
  GradeReviewParams,
  AdminCardPage,
  AdminCardDetail,
  AdminCardsParams,
  AdminPriceSnapshot,
  PriceOverrideInput,
  PulseFeed,
  EngagementSummary,
  InsightsAnswer,
  RetentionReport,
  AnalyticsOverview,
  ApplicationStatusUpdateInput,
  ApplicationSubmitted,
  ApplicationTrack,
  Announcement,
  AnnouncementUpdate,
  BillingConfig,
  CheckoutResult,
  Entitlements,
  PlanConfigUpdate,
  PortalSession,
  Recents,
  SiteConfig,
  SubscribeResult,
  ApplyInput,
  BlogPost,
  BlogPostInput,
  CardAnalytics,
  CardAttributes,
  CardOwnership,
  CardListing,
  CardMarket,
  CardSet,
  CardSparkline,
  CardSummary,
  CarouselResponse,
  ResolvedCarousels,
  CardValuation,
  MarketSnapshot,
  NearbyListing,
  SealedHolding,
  SealedHoldingCreateInput,
  SealedHoldingsParams,
  SealedHoldingUpdateInput,
  SealedProduct,
  SealedMarket,
  SealedSearchParams,
  SetProgressRow,
  SoldComp,
  PortfolioHistory,
  ScanResult,
  CreateGradeInput,
  CreateAlertInput,
  PriceAlert,
  FeatureFlag,
  FeatureFlagCreateInput,
  FeatureFlagUpdateInput,
  FeatureFlagUpsertInput,
  FlagMap,
  AdminCarouselRecipe,
  AdminCarouselsView,
  AiSearchAnswer,
  AppRemoteConfig,
  CarouselRailPage,
  CarouselRecipeCreate,
  CarouselRecipeUpdate,
  CollectionSummary,
  GradedCard,
  GradesParams,
  HomeFeed,
  UserReport,
  UpcomingReport,
  GenerateReportInput,
  JobApplication,
  JobApplicationDetail,
  JobPosting,
  JobPostingInput,
  MarketplaceQuote,
  PriceSeries,
  PublicBrowseParams,
  PublicSearchParams,
  PublicTrendingParams,
  SearchPage,
  SignInRequest,
  SignUpRequest,
  TestAccount,
  LoginResult,
  TokenPair,
  UpdateGradeInput,
  User,
  UserSettings,
  UserSettingsUpdate,
  VaultSummary,
  WaitlistEntry,
  WaitlistJoinInput,
  WaitlistJoined,
  WaitlistStats,
  WaitlistStatus,
  WatchlistItem,
} from "./types";

/** Generic query hook — pass a key, a fetcher, and optional React Query options. */
export function useApiQuery<T>(
  key: ReadonlyArray<unknown>,
  fn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, ApiError>, "queryKey" | "queryFn">,
) {
  return useQuery<T, ApiError>({ queryKey: key, queryFn: fn, ...options });
}

/** Generic mutation hook — pass a mutator and optional React Query options. */
export function useApiMutation<TData, TVars>(
  fn: (vars: TVars) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, ApiError, TVars>, "mutationFn">,
) {
  return useMutation<TData, ApiError, TVars>({ mutationFn: fn, ...options });
}

// ── Domain hooks (shared by every screen on every platform) ──

/** Trending cards for the discovery rails. */
export const useTrending = () =>
  useApiQuery<CardSummary[]>(["trending"], api.cards.trending, {
    staleTime: 60_000,
  });

/** Card search (disabled until the query is meaningful). */
export const useSearch = (q: string) =>
  useApiQuery<CardSummary[]>(["search", q], () => api.cards.search(q), {
    enabled: q.trim().length > 1,
    staleTime: 60_000,
  });

/** Server-derived storefront search (filter/sort/paginate/facets done on the backend). */
export const usePublicSearch = (params: PublicSearchParams, enabled = true) =>
  useApiQuery<SearchPage>(
    ["public-search", params],
    () => api.cards.publicSearch(params),
    {
      enabled,
      // Short window so a transient empty (a cold `tcg=all` fan-out that timed
      // out) self-heals on the next interaction instead of sticking around.
      staleTime: 15_000,
      placeholderData: (prev) => prev, // keep the previous page visible while the next loads
    },
  );

/** Browse a whole game catalog server-side (thousands of cards, real paging). */
export const usePublicBrowse = (params: PublicBrowseParams, enabled = true) =>
  useApiQuery<SearchPage>(
    ["public-browse", params],
    () => api.cards.publicBrowse(params),
    {
      enabled,
      staleTime: 60_000,
      placeholderData: (prev) => prev,
    },
  );

/** Batch sparklines for a set of visible cards (one request, keyed by id). */
export const usePublicSparklines = (ids: string[], enabled = true) =>
  useApiQuery<CardSparkline[]>(
    ["public-sparklines", ids],
    () => api.cards.sparklines(ids),
    { enabled: enabled && ids.length > 0, staleTime: 60_000 },
  );

/** Server-derived trending variant (e.g. value-sorted, price-capped). */
export const usePublicTrending = (params: PublicTrendingParams = {}) =>
  useApiQuery<CardSummary[]>(
    ["public-trending", params],
    () => api.cards.publicTrending(params),
    {
      staleTime: 60_000,
    },
  );

/** AI-designed marketplace carousel recipes for a game (cached daily). */
export const usePublicCarousels = (game: string) =>
  useApiQuery<CarouselResponse>(
    ["public-carousels", game],
    () => api.cards.publicCarousels(game),
    { staleTime: 30 * 60_000 },
  );

/** A game's carousels ALREADY resolved into cards server-side — the single
 *  source of truth both web and mobile render (no client-side filtering). */
export const usePublicCarouselsResolved = (game: string) =>
  useApiQuery<ResolvedCarousels>(
    ["public-carousels-resolved", game],
    () => api.cards.publicCarouselsResolved(game),
    { staleTime: 10 * 60_000 },
  );

/** One carousel EXPANDED — the "view more" behind a rail, truly paginated. */
export const useCarouselRail = (
  params: { game: string; railId: string; page: number; pageSize?: number },
  enabled = true,
) =>
  useApiQuery<CarouselRailPage>(
    [
      "public-carousel-rail",
      params.game,
      params.railId,
      params.page,
      params.pageSize ?? 24,
    ],
    () =>
      api.cards.publicCarouselRail({
        game: params.game,
        id: params.railId,
        page: params.page,
        pageSize: params.pageSize ?? 24,
      }),
    { enabled: enabled && params.railId.length > 0, staleTime: 5 * 60_000 },
  );

/** Offline fallback for the AI description limit — the LIVE value rides
 *  `/v1/app/config` (`useAiSearchLimits`), so a backend change reaches every
 *  client on the next config refresh, no release. */
export const AI_QUERY_MAX_CHARS = 200;

/** Server-driven client configuration (flags, AI limits). Cached long —
 *  it changes on backend deploys, not user actions. */
export const useAppConfig = () =>
  useApiQuery<AppRemoteConfig>(["app-config"], api.appConfig, {
    staleTime: 30 * 60_000,
    retry: 1,
  });

/** The backend-served AI search limits + availability. `enabled` is STRICT
 *  opt-in: an old backend, a spent API key, or a provider outage all read as
 *  "hide the feature entirely" instead of surfacing broken states. */
export const useAiSearchLimits = (): {
  queryMaxChars: number;
  enabled: boolean;
} => {
  const { data } = useAppConfig();
  // Tolerant semantics: an aiSearch block means the endpoint exists — up
  // unless EXPLICITLY enabled:false (quota/outage cooldown). No block at all
  // (backend without the AI feature) reads as down.
  const block = data?.aiSearch;
  return {
    queryMaxChars: block?.queryMaxChars ?? AI_QUERY_MAX_CHARS,
    enabled: block ? block.enabled !== false : false,
  };
};

/** Loupe Pro AI "describe it" search — on demand only (the model costs money).
 *  A 402 surfaces via `error`; the caller opens the paywall (ai_search). */
export const useAiSearch = (q: string, asked: boolean, game?: string) => {
  const { queryMaxChars } = useAiSearchLimits();
  const trimmed = q.trim().slice(0, queryMaxChars);
  // The active game tag rides along as the description's preference.
  const tcg = game && game !== "all" ? game : undefined;
  return useApiQuery<AiSearchAnswer>(
    ["ai-search", trimmed, tcg ?? "all"],
    () => api.cards.searchAi(trimmed, 24, tcg),
    {
      enabled: asked && trimmed.length >= 3,
      staleTime: 30 * 60_000,
      retry: false,
    },
  );
};

/** Real price history for a card. `range` is a backend bucket
 *  (`7d|30d|90d|1y|all`); omit for the default window. Keyed by range so
 *  switching timeframes refetches the correctly-grained series. */
export const usePriceHistory = (
  id: string,
  range?: string,
  house?: string,
  grade?: string,
) =>
  useApiQuery<PriceSeries>(
    ["prices", id, range ?? "default", house ?? "raw", grade ?? "all"],
    () => api.cards.prices(id, range, house, grade),
    {
      enabled: Boolean(id),
      staleTime: 300_000,
    },
  );

/** Market snapshot for a card. */
export const useMarket = (id: string) =>
  useApiQuery<CardMarket>(["market", id], () => api.cards.market(id), {
    enabled: Boolean(id),
    staleTime: 300_000,
  });

/** Live per-marketplace prices + buy links. */
export const useMarketplacePrices = (id: string) =>
  useApiQuery<MarketplaceQuote[]>(
    ["marketplace-prices", id],
    () => api.cards.marketplacePrices(id),
    {
      enabled: Boolean(id),
      staleTime: 120_000,
    },
  );

/** Loupe Value — equilibrium fair value + signals + per-grade ladder. */
export const useValuation = (id: string) =>
  useApiQuery<CardValuation>(["valuation", id], () => api.cards.valuation(id), {
    enabled: Boolean(id),
    staleTime: 120_000,
  });

/** Full market snapshot — houses × grades, history buckets, summary. */
export const useCardSnapshot = (id: string) =>
  useApiQuery<MarketSnapshot | null>(
    ["card-snapshot", id],
    () => api.cards.snapshot(id),
    { enabled: Boolean(id), staleTime: 300_000 },
  );

/** Recent sold comps for a card. */
export const useCardComps = (
  id: string,
  opts?: { days?: number; grade?: string; house?: string },
) =>
  useApiQuery<SoldComp[]>(
    ["card-comps", id, opts],
    () => api.cards.comps(id, opts),
    { enabled: Boolean(id), staleTime: 120_000 },
  );

/** Live for-sale listings for a card. */
export const useCardListings = (id: string) =>
  useApiQuery<CardListing[]>(
    ["card-listings", id],
    () => api.cards.listings(id),
    { enabled: Boolean(id), staleTime: 120_000 },
  );

/** Nearby Facebook Marketplace listings (only fires once coords are known). */
export const useNearbyListings = (
  id: string,
  coords: { lat: number; lng: number; radiusKm?: number } | null,
) =>
  useApiQuery<NearbyListing[]>(
    ["card-nearby", id, coords],
    () => api.cards.nearbyListings(id, coords as { lat: number; lng: number }),
    { enabled: Boolean(id) && coords !== null, staleTime: 120_000 },
  );

/** Per-game canonical attributes (Pokédex / MTG oracle / YGO stats). */
export const useCardAttributes = (id: string) =>
  useApiQuery<CardAttributes | null>(
    ["card-attributes", id],
    () => api.cards.attributes(id),
    { enabled: Boolean(id), staleTime: 300_000 },
  );

/** The signed-in user's ownership of one card (copies + cost/value/P-L).
 *  Pass `enabled=false` when signed out — the endpoint requires auth. */
export const useCardHoldings = (id: string, enabled = true) =>
  useApiQuery<CardOwnership>(
    ["card-ownership", id],
    () => api.cards.ownership(id),
    { enabled: Boolean(id) && enabled, staleTime: 60_000 },
  );

/** Derived market analytics for a card (public) — market cap, momentum,
 *  volatility, grade premium, ATH/%-off, liquidity. */
export const useCardAnalytics = (id: string) =>
  useApiQuery<CardAnalytics>(
    ["card-analytics", id],
    () => api.cards.analytics(id),
    { enabled: Boolean(id), staleTime: 300_000 },
  );

/** Per-set completion progress for the signed-in user. */
export const useSetProgress = (enabled = true) =>
  useApiQuery<SetProgressRow[]>(["set-progress"], api.sets.progress, {
    enabled,
    staleTime: 300_000,
  });

/** Public catalog list of sets for a game. */
export const usePublicSets = (tcg: string, enabled = true) =>
  useApiQuery<CardSet[]>(["sets-list", tcg], () => api.sets.list(tcg), {
    enabled,
    staleTime: 600_000,
  });

/* ── Sealed products + holdings ──────────────────────────────────────── */

/** Public sealed-product catalog search (booster boxes, ETBs, tins, …). */
export const usePublicSealedSearch = (
  params: SealedSearchParams = {},
  enabled = true,
) =>
  useApiQuery<SealedProduct[]>(
    ["sealed-search", params],
    () => api.sealed.search(params),
    { enabled, staleTime: 60_000, placeholderData: (prev) => prev },
  );

/** A single sealed-product catalog entry. */
export const useSealedProduct = (id: string) =>
  useApiQuery<SealedProduct>(["sealed-product", id], () => api.sealed.get(id), {
    enabled: Boolean(id),
    staleTime: 300_000,
  });

/** Live market snapshot (low/mid/high/market + MSRP) for one sealed product. */
export const useSealedMarket = (id: string) =>
  useApiQuery<SealedMarket>(
    ["sealed-market", id],
    () => api.sealed.market(id),
    { enabled: Boolean(id), staleTime: 300_000 },
  );

/** The signed-in user's sealed holdings (joined to catalog metadata). */
export const useSealedHoldings = (
  params: SealedHoldingsParams = {},
  enabled = true,
) =>
  useApiQuery<SealedHolding[]>(
    ["sealed-holdings", params],
    () => api.sealedHoldings.list(params),
    { enabled, staleTime: 30_000 },
  );

/** Invalidate everything a sealed-holding change should refresh. */
function invalidateSealedCaches(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["sealed-holdings"] });
  void qc.invalidateQueries({ queryKey: ["analytics-overview"] });
  void qc.invalidateQueries({ queryKey: ["home-feed"] });
}

/** Add a sealed product to the user's vault. */
export const useAddSealedHolding = (
  options?: Omit<
    UseMutationOptions<SealedHolding, ApiError, SealedHoldingCreateInput>,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<SealedHolding, SealedHoldingCreateInput>(
    (input) => api.sealedHoldings.create(input),
    {
      ...options,
      onSuccess: (...args) => {
        invalidateSealedCaches(qc);
        options?.onSuccess?.(...args);
      },
    },
  );
};

/** Edit a sealed holding (quantity, cost basis, opened toggle, notes). */
export const useUpdateSealedHolding = (
  options?: Omit<
    UseMutationOptions<
      SealedHolding,
      ApiError,
      { id: string; input: SealedHoldingUpdateInput }
    >,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<
    SealedHolding,
    { id: string; input: SealedHoldingUpdateInput }
  >(({ id, input }) => api.sealedHoldings.update(id, input), {
    ...options,
    onSuccess: (...args) => {
      invalidateSealedCaches(qc);
      options?.onSuccess?.(...args);
    },
  });
};

/** Remove a sealed holding from the vault (soft-delete). */
export const useDeleteSealedHolding = (
  options?: Omit<UseMutationOptions<void, ApiError, string>, "mutationFn">,
) => {
  const qc = useQueryClient();
  return useApiMutation<void, string>((id) => api.sealedHoldings.remove(id), {
    ...options,
    onSuccess: (...args) => {
      invalidateSealedCaches(qc);
      options?.onSuccess?.(...args);
    },
  });
};

/** Identify a card from a photo (the web scan flow). */
export const useIdentifyCard = (
  options?: Omit<
    UseMutationOptions<ScanResult, ApiError, { image: Blob; tcg?: string }>,
    "mutationFn"
  >,
) =>
  useApiMutation<ScanResult, { image: Blob; tcg?: string }>(
    ({ image, tcg }) => api.cards.identify(image, tcg),
    options,
  );

/** Scan every cached list (trending, search/browse pages, rails) for a
 *  CardSummary with this id. The user almost always reaches a detail page
 *  from a list they were just looking at, so the identity+art+price they
 *  clicked is already in memory — no need to show a skeleton while the
 *  canonical endpoint re-derives it. */
const findCardInListCaches = (
  qc: ReturnType<typeof useQueryClient>,
  id: string,
): CardSummary | undefined => {
  if (!id) return undefined;
  for (const [, data] of qc.getQueriesData<unknown>({})) {
    const pools: unknown[] = Array.isArray(data)
      ? [data]
      : data && typeof data === "object"
        ? [
            (data as { results?: unknown }).results,
            (data as { cards?: unknown }).cards,
          ]
        : [];
    for (const pool of pools) {
      if (!Array.isArray(pool)) continue;
      for (const item of pool) {
        const c = item as Partial<CardSummary> | null;
        if (c && c.id === id && typeof c.name === "string" && c.imageUrl) {
          return c as CardSummary;
        }
      }
    }
  }
  return undefined;
};

/** Canonical identity for a single card.
 *
 *  Seeded from any cached list row (`initialData`) so tile → detail paints
 *  instantly; `initialDataUpdatedAt: 0` marks the seed stale, so the real
 *  canonical fetch still runs in the background and upgrades the data. */
export const useCard = (id: string) => {
  const qc = useQueryClient();
  return useApiQuery<CardSummary>(["card", id], () => api.cards.canonical(id), {
    enabled: Boolean(id),
    staleTime: 300_000,
    initialData: () => findCardInListCaches(qc, id),
    initialDataUpdatedAt: 0,
  });
};

/** Current user — enable once a token is present. */
export const useMe = (enabled: boolean) =>
  useApiQuery<User>(["me"], api.me.get, { enabled, retry: false });

/** The signed-in user's effective Loupe Pro entitlements (plan, limits, gates).
 *  The single source of truth the UI gates on — honours the kill switch. */
export const useEntitlements = (enabled: boolean) =>
  useApiQuery<Entitlements>(["entitlements"], api.me.entitlements, {
    enabled,
    staleTime: 60_000,
  });

/** Pro pricing + whether real Stripe checkout is live (for the paywall). */
export const useBillingConfig = (enabled = true) =>
  useApiQuery<BillingConfig>(["billing-config"], api.me.billingConfig, {
    enabled,
    staleTime: 300_000,
  });

/** Start a Loupe Pro checkout — resolves to a checkout URL or a
 *  "launching soon" notice while Stripe isn't wired yet. */
export const useStartCheckout = (
  options?: Omit<
    UseMutationOptions<CheckoutResult, ApiError, "monthly" | "yearly">,
    "mutationFn"
  >,
) =>
  useApiMutation<CheckoutResult, "monthly" | "yearly">(
    (interval) => api.me.startCheckout(interval),
    options,
  );

/** Open the Stripe customer portal so a Pro member can manage or cancel. */
export const useBillingPortal = (
  options?: Omit<
    UseMutationOptions<PortalSession, ApiError, void>,
    "mutationFn"
  >,
) => useApiMutation<PortalSession, void>(() => api.me.billingPortal(), options);

/** Per-user settings (currency, theme, notification opt-outs). */
export const useUserSettings = (enabled = true) =>
  useApiQuery<UserSettings>(["me-settings"], api.me.settings, {
    enabled,
    staleTime: 60_000,
  });

/** Patch user settings; the server's copy replaces the cached one. */
export const useUpdateUserSettings = (
  options?: Omit<
    UseMutationOptions<UserSettings, ApiError, UserSettingsUpdate>,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<UserSettings, UserSettingsUpdate>(
    (patch) => api.me.updateSettings(patch),
    {
      ...options,
      onSuccess: (data, ...rest) => {
        qc.setQueryData(["me-settings"], data);
        options?.onSuccess?.(data, ...rest);
      },
    },
  );
};

/** The signed-in user's cross-device recents (searches + recently-viewed). */
export const useRecents = (enabled = true) =>
  useApiQuery<Recents>(["me-recents"], api.me.recents, {
    enabled,
    staleTime: 60_000,
  });

/** Replace the server copy of recents with the client's merged list. */
export const usePutRecents = (
  options?: Omit<UseMutationOptions<Recents, ApiError, Recents>, "mutationFn">,
) => useApiMutation<Recents, Recents>((p) => api.me.putRecents(p), options);

/** Create a subscription for the in-app Payment Element (returns a client
 *  secret to confirm). The webhook grants the plan once payment succeeds. */
export const useSubscribe = (
  options?: Omit<
    UseMutationOptions<SubscribeResult, ApiError, "monthly" | "yearly">,
    "mutationFn"
  >,
) =>
  useApiMutation<SubscribeResult, "monthly" | "yearly">(
    (interval) => api.me.subscribe(interval),
    options,
  );

/** Sign-in mutation. Resolves to a {@link LoginResult} — a token pair, or an
 *  MFA challenge when the account has two-factor enabled. */
export const useLogin = () =>
  useApiMutation<LoginResult, SignInRequest>(api.auth.login);

/** Sign-up mutation. */
export const useRegister = () =>
  useApiMutation<TokenPair, SignUpRequest>(api.auth.register);

/** Whole-portfolio analytics (stats, set indexes, movers, distributions),
 *  scoped to the active collection (omit for the whole vault). */
export const useAnalyticsOverview = (
  collectionId?: string | null,
  enabled = true,
) =>
  useApiQuery<AnalyticsOverview>(
    ["analytics-overview", collectionId ?? "all"],
    () => api.analytics.overview(collectionId),
    { enabled, staleTime: 60_000 },
  );

/** The portfolio switcher: "All" + each collection with counts + value. */
export const useCollectionsOverview = (enabled = true) =>
  useApiQuery<CollectionSummary[]>(
    ["collections-overview"],
    api.collections.overview,
    { enabled, staleTime: 30_000 },
  );

/** Create a named portfolio. Invalidates the switcher list. */
export function useCreateCollection(
  options?: Omit<
    UseMutationOptions<{ id: string }, ApiError, { name: string; color?: string | null }>,
    "mutationFn"
  >,
) {
  const qc = useQueryClient();
  return useApiMutation<{ id: string }, { name: string; color?: string | null }>(
    (input) => api.collections.create(input),
    {
      ...options,
      onSuccess: (...args) => {
        void qc.invalidateQueries({ queryKey: ["collections-overview"] });
        options?.onSuccess?.(...args);
      },
    },
  );
}

/** Rename / recolor a portfolio. */
export function useUpdateCollection(
  options?: Omit<
    UseMutationOptions<
      void,
      ApiError,
      { id: string; name?: string; color?: string | null }
    >,
    "mutationFn"
  >,
) {
  const qc = useQueryClient();
  return useApiMutation<void, { id: string; name?: string; color?: string | null }>(
    ({ id, ...input }) => api.collections.update(id, input),
    {
      ...options,
      onSuccess: (...args) => {
        void qc.invalidateQueries({ queryKey: ["collections-overview"] });
        options?.onSuccess?.(...args);
      },
    },
  );
}

/** Delete a portfolio (holdings remain in the vault / "All"). */
export function useDeleteCollection(
  options?: Omit<UseMutationOptions<void, ApiError, string>, "mutationFn">,
) {
  const qc = useQueryClient();
  return useApiMutation<void, string>((id) => api.collections.remove(id), {
    ...options,
    onSuccess: (...args) => {
      void qc.invalidateQueries({ queryKey: ["collections-overview"] });
      options?.onSuccess?.(...args);
    },
  });
}

function invalidateCollectionMembership(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["collections-overview"] });
  void qc.invalidateQueries({ queryKey: ["grades"] });
  void qc.invalidateQueries({ queryKey: ["vault-summary"] });
  void qc.invalidateQueries({ queryKey: ["analytics-overview"] });
}

/** Bulk-add holdings to a collection. */
export function useBulkAddToCollection(
  options?: Omit<
    UseMutationOptions<
      { added: number; removed: number },
      ApiError,
      { collectionId: string; gradedCardIds: string[] }
    >,
    "mutationFn"
  >,
) {
  const qc = useQueryClient();
  return useApiMutation<
    { added: number; removed: number },
    { collectionId: string; gradedCardIds: string[] }
  >(
    ({ collectionId, gradedCardIds }) =>
      api.collections.bulkAddItems(collectionId, gradedCardIds),
    {
      ...options,
      onSuccess: (...args) => {
        invalidateCollectionMembership(qc);
        options?.onSuccess?.(...args);
      },
    },
  );
}

/** Bulk-remove holdings from a collection. */
export function useBulkRemoveFromCollection(
  options?: Omit<
    UseMutationOptions<
      { added: number; removed: number },
      ApiError,
      { collectionId: string; gradedCardIds: string[] }
    >,
    "mutationFn"
  >,
) {
  const qc = useQueryClient();
  return useApiMutation<
    { added: number; removed: number },
    { collectionId: string; gradedCardIds: string[] }
  >(
    ({ collectionId, gradedCardIds }) =>
      api.collections.bulkRemoveItems(collectionId, gradedCardIds),
    {
      ...options,
      onSuccess: (...args) => {
        invalidateCollectionMembership(qc);
        options?.onSuccess?.(...args);
      },
    },
  );
}

/** Transfer holdings from one collection into another. */
export function useTransferBetweenCollections(
  options?: Omit<
    UseMutationOptions<
      { added: number; removed: number },
      ApiError,
      { targetId: string; sourceId: string; gradedCardIds: string[] }
    >,
    "mutationFn"
  >,
) {
  const qc = useQueryClient();
  return useApiMutation<
    { added: number; removed: number },
    { targetId: string; sourceId: string; gradedCardIds: string[] }
  >(
    ({ targetId, sourceId, gradedCardIds }) =>
      api.collections.transferItems(targetId, sourceId, gradedCardIds),
    {
      ...options,
      onSuccess: (...args) => {
        invalidateCollectionMembership(qc);
        options?.onSuccess?.(...args);
      },
    },
  );
}

/** Authenticated home feed — top movers + recent scans. */
export const useHomeFeed = (
  params?: { topMovers?: number; recentScans?: number },
  enabled = true,
) =>
  useApiQuery<HomeFeed>(["home-feed", params], () => api.home.feed(params), {
    enabled,
    staleTime: 60_000,
  });

/** The user's archive of generated PDF statements. */
export const useReports = (enabled = true) =>
  useApiQuery<UserReport[]>(["reports"], api.reports.list, {
    enabled,
    staleTime: 60_000,
  });

/** When the next monthly + yearly statements will auto-close. */
export const useUpcomingReports = (enabled = true) =>
  useApiQuery<UpcomingReport[]>(["reports", "upcoming"], api.reports.upcoming, {
    enabled,
    staleTime: 5 * 60_000,
  });

/** Generate (or reuse) a statement for a given period. */
export const useGenerateReport = (
  options?: Omit<
    UseMutationOptions<UserReport, ApiError, GenerateReportInput>,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<UserReport, GenerateReportInput>(
    (input) => api.reports.create(input),
    {
      ...options,
      onSuccess: (...args) => {
        qc.invalidateQueries({ queryKey: ["reports"] });
        options?.onSuccess?.(...args);
      },
    },
  );
};

/** The signed-in user's watchlist. */
export const useWatchlist = (enabled = true) =>
  useApiQuery<WatchlistItem[]>(["watchlist"], api.watchlist.list, {
    enabled,
    staleTime: 30_000,
  });

/** The signed-in user's collection value over time (dashboard portfolio chart),
 *  scoped to the active collection. */
export const usePortfolioHistory = (
  range = "1Y",
  collectionId?: string | null,
  enabled = true,
) =>
  useApiQuery<PortfolioHistory>(
    ["portfolio-history", range, collectionId ?? "all"],
    () => api.grades.history(range, collectionId),
    { enabled, staleTime: 60_000 },
  );

/** The signed-in user's graded/owned cards (the Vault). `params.collectionId`
 *  scopes to the active portfolio. */
export const useGrades = (params?: GradesParams, enabled = true) =>
  useApiQuery<GradedCard[]>(["grades", params], () => api.grades.list(params), {
    enabled,
    staleTime: 30_000,
  });

/** Whole-vault aggregates from `/v1/grades/summary` — the ONE source for
 *  headline value and unrealized P/L. Never derive these by summing a
 *  paginated `useGrades` page; mobile's home tab renders the same payload. */
export const useVaultSummary = (collectionId?: string | null, enabled = true) =>
  useApiQuery<VaultSummary>(
    ["vault-summary", collectionId ?? "all"],
    () => api.grades.summary(collectionId),
    { enabled, staleTime: 60_000 },
  );

/** Pin a public card (composite id) to the watchlist — resolves then adds. */
export const useAddToWatchlist = (
  options?: Omit<
    UseMutationOptions<WatchlistItem, ApiError, string>,
    "mutationFn"
  >,
) =>
  useApiMutation<WatchlistItem, string>(
    (upstreamId) => api.watchlist.addByUpstream(upstreamId),
    options,
  );

/** Resolve a public composite id (e.g. `pokemontcg:base1-4`) to a stable local
 *  card UUID so owned holdings can be matched to a storefront card. */
export const useResolvedCardId = (upstreamId: string, enabled = true) =>
  useApiQuery<string | null>(
    ["resolve", upstreamId],
    () => api.cards.resolve(upstreamId),
    {
      enabled: enabled && Boolean(upstreamId),
      staleTime: Infinity,
    },
  );

/** Invalidate every surface that reflects the vault after a grade mutation —
 *  the vault list, the portfolio analytics, and the home feed. */
function invalidateGradeCaches(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["grades"] });
  void qc.invalidateQueries({ queryKey: ["vault-summary"] });
  void qc.invalidateQueries({ queryKey: ["analytics-overview"] });
  void qc.invalidateQueries({ queryKey: ["home-feed"] });
}

/**
 * Add a card to the collection (vault). Accepts a public composite
 * `upstreamId` directly. On success, invalidates the vault, analytics, and
 * home-feed caches so every surface reflects the new holding immediately.
 */
export const useAddGrade = (
  options?: Omit<
    UseMutationOptions<GradedCard, ApiError, CreateGradeInput>,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<GradedCard, CreateGradeInput>(
    (input) => api.grades.create(input),
    {
      ...options,
      onSuccess: (...args) => {
        invalidateGradeCaches(qc);
        options?.onSuccess?.(...args);
      },
    },
  );
};

/** Edit an existing holding. Invalidates the same caches as add/delete. */
export const useUpdateGrade = (
  options?: Omit<
    UseMutationOptions<GradedCard, ApiError, UpdateGradeInput>,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<GradedCard, UpdateGradeInput>(
    (input) => api.grades.update(input),
    {
      ...options,
      onSuccess: (...args) => {
        invalidateGradeCaches(qc);
        options?.onSuccess?.(...args);
      },
    },
  );
};

/** Remove a holding from the vault (soft-delete). */
export const useDeleteGrade = (
  options?: Omit<UseMutationOptions<void, ApiError, string>, "mutationFn">,
) => {
  const qc = useQueryClient();
  return useApiMutation<void, string>((id) => api.grades.remove(id), {
    ...options,
    onSuccess: (...args) => {
      invalidateGradeCaches(qc);
      options?.onSuccess?.(...args);
    },
  });
};

// ── Price alerts ──

/** The signed-in user's price alerts (newest first). `pending` hides fired ones. */
export const useAlerts = (pending = false, enabled = true) =>
  useApiQuery<PriceAlert[]>(
    ["alerts", pending],
    () => api.alerts.list(pending),
    { enabled, staleTime: 30_000 },
  );

/** Create a price alert. Accepts a public composite `upstreamId` directly. */
export const useCreateAlert = (
  options?: Omit<
    UseMutationOptions<PriceAlert, ApiError, CreateAlertInput>,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<PriceAlert, CreateAlertInput>(
    (input) => api.alerts.create(input),
    {
      ...options,
      onSuccess: (...args) => {
        void qc.invalidateQueries({ queryKey: ["alerts"] });
        options?.onSuccess?.(...args);
      },
    },
  );
};

/** Delete a price alert by id. */
export const useDeleteAlert = (
  options?: Omit<UseMutationOptions<void, ApiError, string>, "mutationFn">,
) => {
  const qc = useQueryClient();
  return useApiMutation<void, string>((id) => api.alerts.remove(id), {
    ...options,
    onSuccess: (...args) => {
      void qc.invalidateQueries({ queryKey: ["alerts"] });
      options?.onSuccess?.(...args);
    },
  });
};

// ── Developer portal: public careers + blog ──

/** Open roles on the public careers page. */
export const useJobs = () =>
  useApiQuery<JobPosting[]>(["jobs"], api.careers.jobs, { staleTime: 60_000 });

/** A single open role by slug. */
export const useJob = (slug: string) =>
  useApiQuery<JobPosting>(["job", slug], () => api.careers.job(slug), {
    enabled: Boolean(slug),
  });

/** Submit an application to an open role. */
export const useApplyToJob = (
  options?: Omit<
    UseMutationOptions<
      ApplicationSubmitted,
      ApiError,
      { jobId: string; input: ApplyInput }
    >,
    "mutationFn"
  >,
) =>
  useApiMutation<ApplicationSubmitted, { jobId: string; input: ApplyInput }>(
    ({ jobId, input }) => api.careers.apply(jobId, input),
    options,
  );

/** Track an application by id + the email used to apply. */
export const useTrackApplication = (
  applicationId: string,
  email: string,
  enabled: boolean,
) =>
  useApiQuery<ApplicationTrack>(
    ["application-track", applicationId, email],
    () => api.careers.track(applicationId, email),
    {
      enabled: enabled && Boolean(applicationId) && Boolean(email),
      retry: false,
    },
  );

/** Published blog posts. */
export const useBlogPosts = () =>
  useApiQuery<BlogPost[]>(["blog-posts"], api.blog.posts, {
    staleTime: 60_000,
  });

/** A single published post by slug. */
export const useBlogPost = (slug: string) =>
  useApiQuery<BlogPost>(["blog-post", slug], () => api.blog.post(slug), {
    enabled: Boolean(slug),
  });

// ── Scanner waitlist (public) ──

/** Aggregate waitlist counts — drives the "Join N collectors" social proof. */
export const useWaitlistStats = (enabled = true) =>
  useApiQuery<WaitlistStats>(["waitlist-stats"], api.waitlist.stats, {
    enabled,
    staleTime: 60_000,
  });

/** Join the scanner waitlist (the checkout CTA); refreshes stats. */
export const useJoinWaitlist = (
  options?: Omit<
    UseMutationOptions<WaitlistJoined, ApiError, WaitlistJoinInput>,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<WaitlistJoined, WaitlistJoinInput>(
    (input) => api.waitlist.join(input),
    {
      ...options,
      onSuccess: (...args) => {
        void qc.invalidateQueries({ queryKey: ["waitlist-stats"] });
        options?.onSuccess?.(...args);
      },
    },
  );
};

// ── Developer portal: admin ──

/** All job postings (admin). */
export const useAdminJobs = (enabled = true) =>
  useApiQuery<JobPosting[]>(["admin-jobs"], api.admin.jobs.list, { enabled });

/** Create a job posting; refreshes the admin + public job lists. */
export const useCreateJob = (
  options?: Omit<
    UseMutationOptions<JobPosting, ApiError, JobPostingInput>,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<JobPosting, JobPostingInput>(
    (input) => api.admin.jobs.create(input),
    {
      ...options,
      onSuccess: (...args) => {
        void qc.invalidateQueries({ queryKey: ["admin-jobs"] });
        void qc.invalidateQueries({ queryKey: ["jobs"] });
        options?.onSuccess?.(...args);
      },
    },
  );
};

/** Update a job posting. */
export const useUpdateJob = (
  options?: Omit<
    UseMutationOptions<
      JobPosting,
      ApiError,
      { id: string; input: JobPostingInput }
    >,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<JobPosting, { id: string; input: JobPostingInput }>(
    ({ id, input }) => api.admin.jobs.update(id, input),
    {
      ...options,
      onSuccess: (...args) => {
        void qc.invalidateQueries({ queryKey: ["admin-jobs"] });
        void qc.invalidateQueries({ queryKey: ["jobs"] });
        options?.onSuccess?.(...args);
      },
    },
  );
};

/** Delete a job posting. */
export const useDeleteJob = (
  options?: Omit<UseMutationOptions<void, ApiError, string>, "mutationFn">,
) => {
  const qc = useQueryClient();
  return useApiMutation<void, string>((id) => api.admin.jobs.remove(id), {
    ...options,
    onSuccess: (...args) => {
      void qc.invalidateQueries({ queryKey: ["admin-jobs"] });
      void qc.invalidateQueries({ queryKey: ["jobs"] });
      options?.onSuccess?.(...args);
    },
  });
};

/** Applications, optionally filtered by job and/or status (admin). */
export const useAdminApplications = (
  params?: { jobId?: string; status?: string },
  enabled = true,
) =>
  useApiQuery<JobApplication[]>(
    ["admin-applications", params ?? {}],
    () => api.admin.applications.list(params),
    {
      enabled,
      staleTime: 15_000,
    },
  );

/** A single application with its event trail (admin). */
export const useAdminApplication = (id: string, enabled = true) =>
  useApiQuery<JobApplicationDetail>(
    ["admin-application", id],
    () => api.admin.applications.get(id),
    {
      enabled: enabled && Boolean(id),
    },
  );

/** Advance an application's status (and optionally notify the applicant). */
export const useUpdateApplicationStatus = (
  options?: Omit<
    UseMutationOptions<
      JobApplicationDetail,
      ApiError,
      { id: string; input: ApplicationStatusUpdateInput }
    >,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<
    JobApplicationDetail,
    { id: string; input: ApplicationStatusUpdateInput }
  >(({ id, input }) => api.admin.applications.updateStatus(id, input), {
    ...options,
    onSuccess: (data, ...rest) => {
      void qc.invalidateQueries({ queryKey: ["admin-applications"] });
      void qc.invalidateQueries({ queryKey: ["admin-application", data.id] });
      options?.onSuccess?.(data, ...rest);
    },
  });
};

/** All blog posts (admin). */
export const useAdminBlogPosts = (enabled = true) =>
  useApiQuery<BlogPost[]>(["admin-blog"], api.admin.blog.list, { enabled });

/** Create a blog post; refreshes the admin + public post lists. */
export const useCreateBlogPost = (
  options?: Omit<
    UseMutationOptions<BlogPost, ApiError, BlogPostInput>,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<BlogPost, BlogPostInput>(
    (input) => api.admin.blog.create(input),
    {
      ...options,
      onSuccess: (...args) => {
        void qc.invalidateQueries({ queryKey: ["admin-blog"] });
        void qc.invalidateQueries({ queryKey: ["blog-posts"] });
        options?.onSuccess?.(...args);
      },
    },
  );
};

/** Update a blog post. */
export const useUpdateBlogPost = (
  options?: Omit<
    UseMutationOptions<
      BlogPost,
      ApiError,
      { id: string; input: BlogPostInput }
    >,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<BlogPost, { id: string; input: BlogPostInput }>(
    ({ id, input }) => api.admin.blog.update(id, input),
    {
      ...options,
      onSuccess: (...args) => {
        void qc.invalidateQueries({ queryKey: ["admin-blog"] });
        void qc.invalidateQueries({ queryKey: ["blog-posts"] });
        options?.onSuccess?.(...args);
      },
    },
  );
};

/** Delete a blog post. */
export const useDeleteBlogPost = (
  options?: Omit<UseMutationOptions<void, ApiError, string>, "mutationFn">,
) => {
  const qc = useQueryClient();
  return useApiMutation<void, string>((id) => api.admin.blog.remove(id), {
    ...options,
    onSuccess: (...args) => {
      void qc.invalidateQueries({ queryKey: ["admin-blog"] });
      void qc.invalidateQueries({ queryKey: ["blog-posts"] });
      options?.onSuccess?.(...args);
    },
  });
};

// ── Admin: scanner waitlist ──

function invalidateWaitlist(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["admin-waitlist"] });
  void qc.invalidateQueries({ queryKey: ["waitlist-stats"] });
  void qc.invalidateQueries({ queryKey: ["admin-metrics"] });
}

/** Every scanner waitlist signup, optionally filtered by status (admin). */
export const useAdminWaitlist = (
  params?: { status?: WaitlistStatus },
  enabled = true,
) =>
  useApiQuery<WaitlistEntry[]>(
    ["admin-waitlist", params ?? {}],
    () => api.admin.waitlist.list(params),
    {
      enabled,
      staleTime: 15_000,
    },
  );

/** Advance a signup's stage (waiting → invited → purchased). */
export const useSetWaitlistStatus = (
  options?: Omit<
    UseMutationOptions<
      WaitlistEntry,
      ApiError,
      { id: string; status: WaitlistStatus }
    >,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<WaitlistEntry, { id: string; status: WaitlistStatus }>(
    ({ id, status }) => api.admin.waitlist.setStatus(id, status),
    {
      ...options,
      onSuccess: (...args) => {
        invalidateWaitlist(qc);
        options?.onSuccess?.(...args);
      },
    },
  );
};

/** Remove a waitlist signup. */
export const useDeleteWaitlistEntry = (
  options?: Omit<UseMutationOptions<void, ApiError, string>, "mutationFn">,
) => {
  const qc = useQueryClient();
  return useApiMutation<void, string>((id) => api.admin.waitlist.remove(id), {
    ...options,
    onSuccess: (...args) => {
      invalidateWaitlist(qc);
      options?.onSuccess?.(...args);
    },
  });
};

// ── Admin: metrics + user management ──

/** Portal overview metrics (user counts, jobs, applications, posts). */
export const useAdminMetrics = (enabled = true) =>
  useApiQuery<AdminMetrics>(["admin-metrics"], api.admin.metrics, {
    enabled,
    staleTime: 30_000,
  });

/** Searchable, paginated user list. */
export const useAdminUsers = (params?: AdminUsersParams, enabled = true) =>
  useApiQuery<AdminUserPage>(
    ["admin-users", params ?? {}],
    () => api.admin.users.list(params),
    {
      enabled,
      staleTime: 15_000,
      placeholderData: (prev) => prev,
    },
  );

/** After any user mutation, refresh the user list + metrics. */
function invalidateUsers(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["admin-users"] });
  void qc.invalidateQueries({ queryKey: ["admin-metrics"] });
}

/** Grant or revoke a user's admin flag. */
export const useSetUserRole = (
  options?: Omit<
    UseMutationOptions<AdminUser, ApiError, { id: string; isAdmin: boolean }>,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<AdminUser, { id: string; isAdmin: boolean }>(
    ({ id, isAdmin }) => api.admin.users.setRole(id, isAdmin),
    {
      ...options,
      onSuccess: (...a) => {
        invalidateUsers(qc);
        options?.onSuccess?.(...a);
      },
    },
  );
};

/** Comp a user to Loupe Pro (or back to free). Refreshes their entitlements. */
export const useSetUserPlan = (
  options?: Omit<
    UseMutationOptions<
      AdminUser,
      ApiError,
      { id: string; plan: "free" | "pro" }
    >,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<AdminUser, { id: string; plan: "free" | "pro" }>(
    ({ id, plan }) => api.admin.users.setPlan(id, plan),
    {
      ...options,
      onSuccess: (...a) => {
        invalidateUsers(qc);
        void qc.invalidateQueries({ queryKey: ["entitlements"] });
        options?.onSuccess?.(...a);
      },
    },
  );
};

/** Ban a user (optionally with a reason). */
export const useBanUser = (
  options?: Omit<
    UseMutationOptions<
      AdminUser,
      ApiError,
      { id: string; reason?: string | null }
    >,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<AdminUser, { id: string; reason?: string | null }>(
    ({ id, reason }) => api.admin.users.ban(id, reason),
    {
      ...options,
      onSuccess: (...a) => {
        invalidateUsers(qc);
        options?.onSuccess?.(...a);
      },
    },
  );
};

/** Lift a ban. */
export const useUnbanUser = (
  options?: Omit<UseMutationOptions<AdminUser, ApiError, string>, "mutationFn">,
) => {
  const qc = useQueryClient();
  return useApiMutation<AdminUser, string>((id) => api.admin.users.unban(id), {
    ...options,
    onSuccess: (...a) => {
      invalidateUsers(qc);
      options?.onSuccess?.(...a);
    },
  });
};

/** Soft-delete a user account. */
export const useDeleteUser = (
  options?: Omit<UseMutationOptions<void, ApiError, string>, "mutationFn">,
) => {
  const qc = useQueryClient();
  return useApiMutation<void, string>((id) => api.admin.users.remove(id), {
    ...options,
    onSuccess: (...a) => {
      invalidateUsers(qc);
      options?.onSuccess?.(...a);
    },
  });
};

/** A user's full detail (activity aggregates) — for the admin drawer. */
export const useAdminUserDetail = (id: string, enabled = true) =>
  useApiQuery<AdminUserDetail>(
    ["admin-user", id],
    () => api.admin.users.get(id),
    {
      enabled: enabled && Boolean(id),
    },
  );

/** Create a sandbox test account (password returned once). */
export const useCreateTestAccount = (
  options?: Omit<UseMutationOptions<TestAccount, ApiError, void>, "mutationFn">,
) => {
  const qc = useQueryClient();
  return useApiMutation<TestAccount, void>(() => api.admin.users.createTest(), {
    ...options,
    onSuccess: (...a) => {
      invalidateUsers(qc);
      options?.onSuccess?.(...a);
    },
  });
};

// ── Feature flags ──

/** Parse `?ff=key:1,other:0` from the URL into a partial flag map. Lets the
 *  in-portal simulator (and QA) preview flag states without touching the DB.
 *  Web-only; a no-op on platforms without `window`. */
function readFlagOverrides(): FlagMap {
  if (typeof window === "undefined" || !window.location?.search) return {};
  const raw = new URLSearchParams(window.location.search).get("ff");
  if (!raw) return {};
  const out: FlagMap = {};
  for (const pair of raw.split(",")) {
    const [key, value] = pair.split(":");
    if (key) out[key.trim()] = value === "1" || value === "true";
  }
  return out;
}

/** Public flag map (`{key: enabled}`) — what UI gates on. Cached app-wide;
 *  `?ff=` URL overrides are layered on top for previews. */
export const usePublicFlags = () =>
  useApiQuery<FlagMap>(["flags"], api.flags, {
    staleTime: 60_000,
    select: (data) => ({ ...data, ...readFlagOverrides() }),
  });

/** Whether a single feature is on. `fallback` (default true) is used when the
 *  flag is unknown, so a missing/typo'd key never silently hides a feature. */
export const useFeatureFlag = (key: string, fallback = true): boolean => {
  const { data } = usePublicFlags();
  if (!data || !(key in data)) return fallback;
  return data[key] ?? fallback;
};

/** All flags (admin view). */
export const useAdminFlags = (enabled = true) =>
  useApiQuery<FeatureFlag[]>(["admin-flags"], api.admin.flags.list, {
    enabled,
  });

// ── Site config (admin-tunable plan shape + announcement) ──

/** Public announcement banner — what every client polls + renders. */
export const useAnnouncement = () =>
  useApiQuery<Announcement>(["announcement"], api.announcement, {
    staleTime: 60_000,
  });

/** The live site config (admin view) — Pro plan shape + announcement. */
export const useAdminSiteConfig = (enabled = true) =>
  useApiQuery<SiteConfig>(["admin-site-config"], api.admin.config.get, {
    enabled,
  });

function invalidateSiteConfig(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["admin-site-config"] });
  void qc.invalidateQueries({ queryKey: ["announcement"] });
  // Changing the plan shape changes everyone's entitlements.
  void qc.invalidateQueries({ queryKey: ["entitlements"] });
}

/** Update the Pro plan shape (limits + per-feature gating). */
export const useUpdatePlanConfig = (
  options?: Omit<
    UseMutationOptions<SiteConfig, ApiError, PlanConfigUpdate>,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<SiteConfig, PlanConfigUpdate>(
    (input) => api.admin.config.updatePlan(input),
    {
      ...options,
      onSuccess: (...a) => {
        invalidateSiteConfig(qc);
        options?.onSuccess?.(...a);
      },
    },
  );
};

/** Update the global announcement banner. */
export const useUpdateAnnouncement = (
  options?: Omit<
    UseMutationOptions<SiteConfig, ApiError, AnnouncementUpdate>,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<SiteConfig, AnnouncementUpdate>(
    (input) => api.admin.config.updateAnnouncement(input),
    {
      ...options,
      onSuccess: (...a) => {
        invalidateSiteConfig(qc);
        options?.onSuccess?.(...a);
      },
    },
  );
};

function invalidateFlags(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["admin-flags"] });
  void qc.invalidateQueries({ queryKey: ["flags"] });
}

/** Create a feature flag. */
export const useCreateFlag = (
  options?: Omit<
    UseMutationOptions<FeatureFlag, ApiError, FeatureFlagCreateInput>,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<FeatureFlag, FeatureFlagCreateInput>(
    (input) => api.admin.flags.create(input),
    {
      ...options,
      onSuccess: (...a) => {
        invalidateFlags(qc);
        options?.onSuccess?.(...a);
      },
    },
  );
};

/** Update / toggle a feature flag. */
export const useUpdateFlag = (
  options?: Omit<
    UseMutationOptions<
      FeatureFlag,
      ApiError,
      { id: string; input: FeatureFlagUpdateInput }
    >,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<
    FeatureFlag,
    { id: string; input: FeatureFlagUpdateInput }
  >(({ id, input }) => api.admin.flags.update(id, input), {
    ...options,
    onSuccess: (...a) => {
      invalidateFlags(qc);
      options?.onSuccess?.(...a);
    },
  });
};

/** Delete a feature flag. */
export const useDeleteFlag = (
  options?: Omit<UseMutationOptions<void, ApiError, string>, "mutationFn">,
) => {
  const qc = useQueryClient();
  return useApiMutation<void, string>((id) => api.admin.flags.remove(id), {
    ...options,
    onSuccess: (...a) => {
      invalidateFlags(qc);
      options?.onSuccess?.(...a);
    },
  });
};

/** Set a flag's enabled state by key (create-or-toggle) — the inspect overlay. */
export const useUpsertFlag = (
  options?: Omit<
    UseMutationOptions<
      FeatureFlag,
      ApiError,
      { key: string; input: FeatureFlagUpsertInput }
    >,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<
    FeatureFlag,
    { key: string; input: FeatureFlagUpsertInput }
  >(({ key, input }) => api.admin.flags.upsertByKey(key, input), {
    ...options,
    onSuccess: (...a) => {
      invalidateFlags(qc);
      options?.onSuccess?.(...a);
    },
  });
};

// ── Admin: carousel registry ──

/** The carousel registry — file + live overrides + latest AI shelves. */
export const useAdminCarousels = (enabled = true) =>
  useApiQuery<AdminCarouselsView>(
    ["admin-carousels"],
    api.admin.carousels.overview,
    { enabled },
  );

function invalidateCarousels(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["admin-carousels"] });
  // Edits change what the public storefront serves.
  void qc.invalidateQueries({ queryKey: ["public-carousels"] });
  void qc.invalidateQueries({ queryKey: ["public-carousels-resolved"] });
}

/** Wrap a carousel mutation so every write refreshes the registry view. */
const useCarouselMutation = <TData, TVars>(
  mutationFn: (vars: TVars) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, ApiError, TVars>, "mutationFn">,
) => {
  const qc = useQueryClient();
  return useApiMutation<TData, TVars>(mutationFn, {
    ...options,
    onSuccess: (...a) => {
      invalidateCarousels(qc);
      options?.onSuccess?.(...a);
    },
  });
};

/** Toggle / edit one recipe (partial update). */
export const useUpdateCarousel = (
  options?: Omit<
    UseMutationOptions<
      AdminCarouselRecipe,
      ApiError,
      { id: string; input: CarouselRecipeUpdate }
    >,
    "mutationFn"
  >,
) =>
  useCarouselMutation(
    ({ id, input }: { id: string; input: CarouselRecipeUpdate }) =>
      api.admin.carousels.update(id, input),
    options,
  );

/** Add an operator-authored recipe. */
export const useCreateCarousel = (
  options?: Omit<
    UseMutationOptions<AdminCarouselRecipe, ApiError, CarouselRecipeCreate>,
    "mutationFn"
  >,
) =>
  useCarouselMutation(
    (input: CarouselRecipeCreate) => api.admin.carousels.create(input),
    options,
  );

/** Delete a recipe (file recipes tombstone; restore them via reset). */
export const useDeleteCarousel = (
  options?: Omit<UseMutationOptions<void, ApiError, string>, "mutationFn">,
) =>
  useCarouselMutation((id: string) => api.admin.carousels.remove(id), options);

/** Restore a file recipe to its checked-in state. */
export const useResetCarousel = (
  options?: Omit<
    UseMutationOptions<AdminCarouselRecipe, ApiError, string>,
    "mutationFn"
  >,
) =>
  useCarouselMutation((id: string) => api.admin.carousels.reset(id), options);

/** AI kill switch — off pins every game to the curated registry. */
export const useSetCarouselAi = (
  options?: Omit<
    UseMutationOptions<AdminCarouselsView, ApiError, boolean>,
    "mutationFn"
  >,
) =>
  useCarouselMutation(
    (enabled: boolean) => api.admin.carousels.setAi(enabled),
    options,
  );

/** Force a fresh AI design pass for one game (synchronous). */
export const useRegenerateCarousels = (
  options?: Omit<
    UseMutationOptions<CarouselResponse, ApiError, string>,
    "mutationFn"
  >,
) =>
  useCarouselMutation(
    (game: string) => api.admin.carousels.regenerate(game),
    options,
  );

// ── Admin: operations (read-only observability) ──

/** System-health report. Polls so the overview stays live without a refresh. */
export const useAdminHealth = (enabled = true) =>
  useApiQuery<HealthReport>(["admin-health"], api.admin.ops.health, {
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

/** Every table with column/FK counts and live row estimates. */
export const useAdminDbTables = (enabled = true) =>
  useApiQuery<DbOverview>(["admin-db-tables"], api.admin.ops.database.tables, {
    enabled,
    staleTime: 30_000,
  });

/** Full structure for one table (disabled until a table is selected). */
export const useAdminDbTable = (name: string | null, enabled = true) =>
  useApiQuery<DbTableDetail>(
    ["admin-db-table", name],
    () => api.admin.ops.database.table(name as string),
    { enabled: enabled && !!name, staleTime: 30_000 },
  );

/** Foreign-key relationship graph for the schema map. */
export const useAdminDbGraph = (enabled = true) =>
  useApiQuery<DbGraph>(["admin-db-graph"], api.admin.ops.database.graph, {
    enabled,
    staleTime: 60_000,
  });

/** Server-side environment manager (presence + non-secret values; secrets withheld). */
export const useAdminEnv = (enabled = true) =>
  useApiQuery<EnvReport>(["admin-env"], api.admin.ops.env, {
    enabled,
    staleTime: 60_000,
  });

/** External-service (second-party) catalog. Pass `probe` to live-ping each one. */
export const useAdminIntegrations = (probe = false, enabled = true) =>
  useApiQuery<IntegrationsReport>(
    ["admin-integrations", probe],
    () => api.admin.ops.integrations(probe),
    { enabled, staleTime: probe ? 0 : 60_000 },
  );

/** PriceCharting tier, capabilities, fallback chain & mirror status. */
export const useAdminPriceCharting = (enabled = true) =>
  useApiQuery<PriceChartingOverview>(
    ["admin-pricecharting"],
    api.admin.pricecharting.overview,
    { enabled, staleTime: 60_000 },
  );

/** Force a fresh capability probe, then refresh the overview cache. */
export const useAdminPriceChartingProbe = () => {
  const qc = useQueryClient();
  return useApiMutation<PriceChartingOverview, void>(
    () => api.admin.pricecharting.probe(),
    {
      onSuccess: (data) => qc.setQueryData(["admin-pricecharting"], data),
    },
  );
};

/** Trigger a Legendary bulk CSV sync, then refetch the overview. */
export const useAdminPriceChartingSync = () => {
  const qc = useQueryClient();
  return useApiMutation<PriceChartingSyncResult, void>(
    () => api.admin.pricecharting.sync(),
    {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: ["admin-pricecharting"] }),
    },
  );
};

/** Email template gallery + provider status. */
export const useAdminEmailTemplates = (enabled = true) =>
  useApiQuery<EmailTemplatesReport>(
    ["admin-email-templates"],
    api.admin.ops.email.templates,
    { enabled, staleTime: 60_000 },
  );

/** One template rendered with sample data (subject + html + text). */
export const useAdminEmailTemplate = (key: string | null, enabled = true) =>
  useApiQuery<EmailTemplateRender>(
    ["admin-email-template", key],
    () => api.admin.ops.email.template(key as string),
    { enabled: enabled && !!key, staleTime: 60_000 },
  );

/** Send a template to the signed-in admin's own address (real delivery). */
export const useAdminEmailTest = () =>
  useApiMutation<EmailTestResult, string>((template) =>
    api.admin.ops.email.test(template),
  );

/** Render a composed announcement/support draft (no send). */
export const useAdminAnnouncementPreview = () =>
  useApiMutation<
    EmailTemplateRender,
    { draft: AnnouncementDraft; kind?: "announcement" | "support" }
  >(({ draft, kind }) => api.admin.ops.email.announcePreview(draft, kind));

/** Deliver a composed announcement — mode "test" (to yourself) or "send". */
export const useAdminAnnouncementSend = () =>
  useApiMutation<
    AnnouncementSendResult,
    { draft: AnnouncementDraft; mode: "test" | "send" }
  >(({ draft, mode }) => api.admin.ops.email.announce(draft, mode));

/** Send a one-to-one support message — mode "test" (to yourself) or "send". */
export const useAdminSupportSend = () =>
  useApiMutation<
    SupportSendResult,
    { draft: SupportDraft; mode: "test" | "send" }
  >(({ draft, mode }) => api.admin.ops.email.support(draft, mode));

/** Email delivery log — every send, queue → delivered/bounced. */
export const useAdminEmailLog = (params?: EmailLogParams, enabled = true) =>
  useApiQuery<EmailLogPage>(
    ["admin-email-log", params ?? {}],
    () => api.admin.ops.email.log(params),
    { enabled, staleTime: 10_000, placeholderData: (prev) => prev },
  );

/** One logged email, including the stored render. */
export const useAdminEmailLogEntry = (id: string | null, enabled = true) =>
  useApiQuery<EmailLogDetail>(
    ["admin-email-log-entry", id],
    () => api.admin.ops.email.logEntry(id as string),
    { enabled: enabled && !!id, staleTime: 60_000 },
  );

/** Re-send a failed email from its stored render. */
export const useAdminEmailLogRetry = () =>
  useApiMutation<EmailTestResult, string>((id) =>
    api.admin.ops.email.logRetry(id),
  );

/** Cloud Run + Cloud SQL status (graceful when GCP isn't configured). */
export const useAdminCloud = (enabled = true) =>
  useApiQuery<CloudStatus>(["admin-cloud"], api.admin.ops.cloud.status, {
    enabled,
    staleTime: 30_000,
  });

/** Recent Cloud Run log tail. */
export const useAdminCloudLogs = (limit = 25, enabled = true) =>
  useApiQuery<CloudLogEntry[]>(
    ["admin-cloud-logs", limit],
    () => api.admin.ops.cloud.logs(limit),
    { enabled, staleTime: 15_000 },
  );

/** Paginated, filterable audit log. */
export const useAdminAudit = (params?: AuditParams, enabled = true) =>
  useApiQuery<AuditPage>(
    ["admin-audit", params ?? {}],
    () => api.admin.ops.audit.list(params),
    { enabled, staleTime: 10_000, placeholderData: (prev) => prev },
  );

/** Distinct actions + tables for the audit filter dropdowns. */
export const useAdminAuditFacets = (enabled = true) =>
  useApiQuery<AuditFacets>(["admin-audit-facets"], api.admin.ops.audit.facets, {
    enabled,
    staleTime: 60_000,
  });

// ── Admin: revenue + account actions ──

/** Subscription revenue summary (counts, est. MRR/ARR, churn, trend). */
export const useAdminRevenue = (enabled = true) =>
  useApiQuery<RevenueSummary>(["admin-revenue"], api.admin.revenue, {
    enabled,
    staleTime: 30_000,
  });

/** Sign a user out everywhere (revoke all tokens). Refreshes their detail. */
export const useRevokeUserSessions = (
  options?: Omit<
    UseMutationOptions<AdminUserDetail, ApiError, string>,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<AdminUserDetail, string>(
    (id) => api.admin.users.revokeSessions(id),
    {
      ...options,
      onSuccess: (data, ...rest) => {
        void qc.invalidateQueries({ queryKey: ["admin-user", data.id] });
        options?.onSuccess?.(data, ...rest);
      },
    },
  );
};

/** Mint a token to view the app as a user (super-admin). */
export const useImpersonateUser = (
  options?: Omit<
    UseMutationOptions<ImpersonateResult, ApiError, string>,
    "mutationFn"
  >,
) =>
  useApiMutation<ImpersonateResult, string>(
    (id) => api.admin.users.impersonate(id),
    options,
  );

/** Refund a user's latest charge (super-admin, money-out). */
export const useRefundUser = (
  options?: Omit<
    UseMutationOptions<RefundResult, ApiError, string>,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<RefundResult, string>(
    (id) => api.admin.users.refundLatest(id),
    {
      ...options,
      onSuccess: (data, id, ...rest) => {
        void qc.invalidateQueries({ queryKey: ["admin-user", id] });
        options?.onSuccess?.(data, id, ...rest);
      },
    },
  );
};

/** Cancel a user's Stripe subscription (super-admin). Refreshes detail + revenue. */
export const useCancelUserSubscription = (
  options?: Omit<
    UseMutationOptions<
      AdminUserDetail,
      ApiError,
      { id: string; immediately?: boolean }
    >,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<AdminUserDetail, { id: string; immediately?: boolean }>(
    ({ id, immediately }) =>
      api.admin.users.cancelSubscription(id, immediately),
    {
      ...options,
      onSuccess: (data, ...rest) => {
        void qc.invalidateQueries({ queryKey: ["admin-user", data.id] });
        void qc.invalidateQueries({ queryKey: ["admin-users"] });
        void qc.invalidateQueries({ queryKey: ["admin-revenue"] });
        options?.onSuccess?.(data, ...rest);
      },
    },
  );
};

// ── Admin: catalog + scanner analytics ──

/** Catalog coverage by game (cards/sets, pHash %, price sources). */
export const useAdminCatalog = (enabled = true) =>
  useApiQuery<CatalogCoverage>(["admin-catalog"], api.admin.catalog, {
    enabled,
    staleTime: 60_000,
  });

/** Card/Set data lineage — provider per field + ordered price fallback chain. */
export const useAdminCardTree = (enabled = true) =>
  useApiQuery<CardTree>(["admin-card-tree"], api.admin.cardTree, {
    enabled,
    staleTime: 300_000,
  });

/** Grade-review queue — QA of graded cards (Loupe first-party by default). */
export const useAdminGrades = (params?: GradeReviewParams, enabled = true) =>
  useApiQuery<GradeReviewPage>(
    ["admin-grades", params ?? {}],
    () => api.admin.gradeReview(params),
    { enabled, staleTime: 30_000, placeholderData: (prev) => prev },
  );

/** Scan + identify funnel metrics over a rolling window. */
export const useAdminScanner = (days = 30, enabled = true) =>
  useApiQuery<ScannerStats>(
    ["admin-scanner", days],
    () => api.admin.scanner(days),
    { enabled, staleTime: 30_000 },
  );

/** Daily speed + accuracy trend series for the scanner charts. */
export const useAdminScannerTrend = (days = 30, enabled = true) =>
  useApiQuery<ScannerTrend>(
    ["admin-scanner-trend", days],
    () => api.admin.scannerTrend(days),
    { enabled, staleTime: 30_000 },
  );

/** Scan history log — every scan's photo + metadata (paginated + filtered). */
export const useAdminScanHistory = (q: ScanHistoryQuery = {}, enabled = true) =>
  useApiQuery<ScanHistoryPage>(
    ["admin-scan-history", q],
    () => api.admin.scanHistory(q),
    { enabled, staleTime: 15_000, placeholderData: (prev) => prev },
  );

/** One scan's full drill-down (candidates + raw OCR). Enabled when `id` is set. */
export const useAdminScanDetail = (id: string | null) =>
  useApiQuery<ScanHistoryDetail>(
    ["admin-scan-detail", id],
    () => api.admin.scanDetail(id as string),
    { enabled: !!id, staleTime: 60_000 },
  );

/** Live activity feed — polls so the stream stays current. */
export const useAdminPulse = (limit = 40, enabled = true) =>
  useApiQuery<PulseFeed>(["admin-pulse", limit], () => api.admin.pulse(limit), {
    enabled,
    staleTime: 5_000,
    refetchInterval: 15_000,
  });

/** Engagement & retention summary (active collectors, activation, funnel). */
export const useAdminEngagement = (enabled = true) =>
  useApiQuery<EngagementSummary>(["admin-engagement"], api.admin.engagement, {
    enabled,
    staleTime: 60_000,
  });

/** Cohort-retention triangle (signup-week cohorts × weeks active). */
export const useAdminRetention = (enabled = true) =>
  useApiQuery<RetentionReport>(["admin-retention"], api.admin.retention, {
    enabled,
    staleTime: 60_000,
  });

/** Whether the "Ask your data" tool is configured (ANTHROPIC_API_KEY set). */
export const useAdminInsightsStatus = (enabled = true) =>
  useApiQuery<{ configured: boolean }>(
    ["admin-insights-status"],
    api.admin.insights.status,
    { enabled, staleTime: 300_000 },
  );

/** Ask a natural-language question of the database (read-only, super-admin). */
export const useAskInsights = (
  options?: Omit<
    UseMutationOptions<InsightsAnswer, ApiError, string>,
    "mutationFn"
  >,
) =>
  useApiMutation<InsightsAnswer, string>(
    (q) => api.admin.insights.ask(q),
    options,
  );

/** Search the local card catalog (admin explorer). */
export const useAdminCards = (params?: AdminCardsParams, enabled = true) =>
  useApiQuery<AdminCardPage>(
    ["admin-cards", params ?? {}],
    () => api.admin.cards.search(params),
    { enabled, staleTime: 15_000, placeholderData: (prev) => prev },
  );

/** A single card's full record (refs + price ladder). */
export const useAdminCard = (id: string | null, enabled = true) =>
  useApiQuery<AdminCardDetail>(
    ["admin-card", id],
    () => api.admin.cards.get(id as string),
    { enabled: enabled && Boolean(id) },
  );

/** Record a manual price override (super-admin); refreshes the card detail. */
export const useAddCardPriceOverride = (
  options?: Omit<
    UseMutationOptions<
      AdminPriceSnapshot,
      ApiError,
      { id: string; input: PriceOverrideInput }
    >,
    "mutationFn"
  >,
) => {
  const qc = useQueryClient();
  return useApiMutation<
    AdminPriceSnapshot,
    { id: string; input: PriceOverrideInput }
  >(({ id, input }) => api.admin.cards.addPrice(id, input), {
    ...options,
    onSuccess: (data, vars, ...rest) => {
      void qc.invalidateQueries({ queryKey: ["admin-card", vars.id] });
      options?.onSuccess?.(data, vars, ...rest);
    },
  });
};
