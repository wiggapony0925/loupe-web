/**
 * The unified API surface. Every backend call lives here as one typed function,
 * grouped by domain. UI never builds URLs or maps payloads — it calls `api.x.y()`.
 */
import { apiFetch } from "./client";
import { ENDPOINTS } from "./endpoints";
import {
  canonicalToSummary,
  toCardMarket,
  toCardSummary,
  toCardValuation,
  toMarketplaceQuotes,
  toPriceSeries,
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
import type {
  AdminMetrics,
  AdminUser,
  AdminUserDetail,
  AdminUserPage,
  AdminUsersParams,
  AnalyticsOverview,
  ApplicationStatusUpdateInput,
  ApplicationSubmitted,
  ApplicationTrack,
  ApplyInput,
  BlogPost,
  BlogPostInput,
  CardMarket,
  CardSparkline,
  CardSummary,
  PortfolioHistory,
  CardValuation,
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
  SearchPage,
  SignInRequest,
  SignUpRequest,
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
    /** Public market snapshot. */
    market: async (id: string): Promise<CardMarket> => {
      const d = await apiFetch<{
        snapshot?: { summary?: Record<string, never> };
      }>(ENDPOINTS.cards.market(id));
      return toCardMarket(d);
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
  auth: {
    /** Email + password sign-in → TokenPair. */
    login: (body: SignInRequest) =>
      apiFetch<TokenPair>(ENDPOINTS.auth.login, {
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
  },
  me: {
    /** Current authenticated user. */
    get: () => apiFetch<User>(ENDPOINTS.me.root),
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
  /** Admin developer-portal surface (requires an admin user). */
  admin: {
    /** At-a-glance portal metrics. */
    metrics: async (): Promise<AdminMetrics> =>
      toAdminMetrics(await apiFetch(ENDPOINTS.admin.metrics)),
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
