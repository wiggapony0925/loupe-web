/** Shared view-model + wire types. Derived from the live backend responses. */

export interface Money {
  amount: number;
  currency: string;
}

export type Trend = "up" | "down" | "flat";

/** One rung of the per-grade price ladder (UNGRADED, PSA 10, BGS 9.5, …). */
export interface GradePrice {
  /** Display label, e.g. "UNGRADED" or "PSA 10". */
  grade: string;
  /** Grading house, lowercased ("psa" | "bgs" | "cgc"), or null for raw. */
  house?: string | null;
  lastSale?: Money | null;
  lastSaleAt?: string | null;
  lastSaleUrl?: string | null;
  medianRecent?: Money | null;
  salesCount: number;
  /** 30-day median-vs-median change. */
  deltaPct?: number | null;
}

/** Loupe Value — equilibrium fair value + the signals behind it + grade ladder. */
export interface CardValuation {
  cardId: string;
  /** The blended equilibrium price for the raw card. */
  fairValue?: Money | null;
  /** How many independent signals agreed (0–3): more = tighter estimate. */
  confidence: number;
  signals: {
    soldComps?: Money | null;
    listings?: Money | null;
    catalog?: Money | null;
  };
  grades: GradePrice[];
}

/** One ranked match from a card scan (POST /v1/cards/identify). */
export interface ScanCandidate {
  /** Route id for the card detail page (the composite "<source>:<id>"). */
  id: string;
  name: string;
  setName?: string;
  number?: string;
  imageUrl?: string;
  tcg?: string;
  /** 0–1 match confidence. */
  confidence: number;
}

/** Result of identifying a card from a photo. */
export interface ScanResult {
  candidates: ScanCandidate[];
  /** Confidence of the top candidate (0 if none). */
  accuracy: number;
}

/** A card as shown in lists/grids — mapped from trending/search results. */
export interface CardSummary {
  id: string;
  name: string;
  setName: string;
  number?: string;
  rarity?: string;
  year?: number;
  imageUrl: string;
  /** Current market price. */
  price?: Money;
  /** Lowest listing price (TCGplayer "from $X"). */
  low?: Money;
}

/** A compact trend series for a list-row sparkline (Robinhood/StockX style). */
export interface CardSparkline {
  cardId: string;
  /** Recent prices, oldest → newest. */
  points: number[];
  /** Period change %, signed (drives the up/down colour). */
  changePct?: number | null;
}

/** A normalized price history series (from `/v1/cards/:id/prices`). */
/** One marketplace's live quote for a card (from `/marketplace-prices`). */
export interface MarketplaceQuote {
  source: string;
  label: string;
  kind: "listing" | "market_price";
  price?: Money;
  /** Direct listing URL when available; otherwise fall back to `searchUrl`. */
  url?: string;
  searchUrl?: string;
  subtitle?: string;
  isAuction?: boolean;
}

// ── Analytics / portfolio (mirrors GET /v1/analytics/overview, camelCase) ──

export interface AnalyticsStats {
  holdings: number;
  uniqueSets: number;
  avgGrade: number;
  gemRatePct: number;
  avgValueUsd: number;
  oldestYear: number | null;
  totalValueUsd: number;
}
export interface AnalyticsKpis {
  totalScans: number;
  avgGrade: number;
  gemRatePct: number;
  lastScanAt: string | null;
  graderSplit: { psa: number; bgs: number; cgc: number };
}
export interface AnalyticsSetIndex {
  setName: string;
  count: number;
  totalValueUsd: number;
  sharePct: number;
  changePct1y: number | null;
}
export interface AnalyticsMoverRow {
  gradeId: string;
  cardId: string | null;
  cardName: string | null;
  cardImageUrl: string | null;
  setName: string | null;
  valueUsd: number;
  changePct1y: number;
}
export interface AnalyticsConcentration {
  top1Pct: number;
  top3Pct: number;
  top5Pct: number;
  top1: { cardName: string | null; valueUsd: number };
}
export interface AnalyticsYearBucket {
  decade: number;
  count: number;
  valueUsd: number;
}
export interface AnalyticsGradeBucket {
  bucket: string;
  count: number;
}
export interface AnalyticsOverview {
  stats: AnalyticsStats;
  kpis: AnalyticsKpis;
  setIndexes: AnalyticsSetIndex[];
  movers: { gainers: AnalyticsMoverRow[]; losers: AnalyticsMoverRow[] };
  concentration: AnalyticsConcentration | null;
  yearDistribution: AnalyticsYearBucket[];
  gradeDistribution: AnalyticsGradeBucket[];
}

export interface TopMoverRow {
  gradeId: string;
  cardId: string | null;
  cardName: string | null;
  cardImageUrl: string | null;
  cardSetName?: string | null;
  priceUsd: number | null;
  changePct1y: number | null;
}
export interface RecentScanRow {
  gradeId: string;
  cardId: string | null;
  cardName: string | null;
  cardImageUrl: string | null;
  cardSetName: string | null;
  grade: number | null;
  house: string | null;
  scannedAt: string | null;
  estimatedValueUsd: number | null;
}
export interface HomeFeed {
  topMovers: TopMoverRow[];
  recentScans: RecentScanRow[];
}

/** A graded/owned card in the user's vault (from GET /v1/grades). */
export interface GradedCard {
  id: string;
  cardId: string;
  cardName?: string;
  cardImageUrl?: string;
  cardSetName?: string;
  cardNumber?: string;
  grade: number;
  house: string;
  condition?: RawCondition | null;
  estimatedValueUsd?: number;
  purchasePriceUsd?: number;
  purchaseDate?: string | null;
  notes?: string | null;
  /** Total graded copies of this card the user owns (backend `copies_owned`). */
  copies?: number;
}

export interface GradesParams {
  sort?: "value_desc" | "value_asc" | "grade_desc" | "grade_asc";
  limit?: number;
  cursor?: number;
  house?: string;
}

/** Grading house. `loupe` = ungraded/raw (uses `condition` instead of a slab grade). */
export type GradeHouse = "psa" | "bgs" | "sgc" | "cgc" | "tag" | "loupe";

/** Raw-card condition (only meaningful when `house === "loupe"`). */
export type RawCondition = "nm" | "lp" | "mp" | "hp" | "dmg";

/** Add a card to the user's collection (vault). Either `cardId` or
 *  `upstreamId` (e.g. `"pokemontcg:base1-4"`) must be supplied — the backend
 *  materializes the local card row from an upstream id. Mirrors the mobile
 *  app's `useCreateGrade`. */
export interface CreateGradeInput {
  cardId?: string | null;
  upstreamId?: string | null;
  /** Numeric grade in [0, 10]. For raw cards pass 0 and set `condition`. */
  grade: number;
  house: GradeHouse;
  condition?: RawCondition | null;
  purchasePriceUsd?: number | null;
  purchaseDate?: string | null;
  estimatedValueUsd?: number | null;
  notes?: string | null;
}

/** Edit an existing holding. Every field is optional — send only what changed.
 *  Mirrors the mobile app's `useUpdateGrade` and `PATCH /v1/grades/{id}`. */
export interface UpdateGradeInput {
  id: string;
  grade?: number;
  house?: GradeHouse;
  condition?: RawCondition | null;
  purchasePriceUsd?: number | null;
  purchaseDate?: string | null;
  estimatedValueUsd?: number | null;
  notes?: string | null;
}

/** A pinned card on the user's watchlist (name/image joined for the UI). */
export interface WatchlistItem {
  id: string;
  cardId: string;
  cardName?: string;
  cardImageUrl?: string;
}

export type SortKey = "best" | "price_asc" | "price_desc" | "name";

/** Distinct filter values the server computed for the current result set. */
export interface SearchFacets {
  rarities: string[];
  sets: string[];
}

/** One server-paginated page of search results (all derivation done server-side). */
export interface SearchPage {
  results: CardSummary[];
  total: number;
  page: number;
  pageSize: number;
  facets: SearchFacets;
}

export interface PublicSearchParams {
  q?: string;
  tcg?: string;
  rarity?: string | null;
  set?: string | null;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

export interface PublicTrendingParams {
  tcg?: string;
  sort?: "trending" | "value";
  maxPrice?: number;
  limit?: number;
}

export type BrowseSort = "name" | "newest" | "price_asc" | "price_desc";

export interface PublicBrowseParams {
  /** pokemon | magic | yugioh | lorcana | onepiece | digimon */
  game?: string;
  page?: number;
  pageSize?: number;
  sort?: BrowseSort;
}

export interface PriceSeries {
  points: number[];
  /** Epoch-ms timestamps, parallel to `points` (for time-aware charts). */
  at: number[];
  currency: string;
  changePct: number;
}

/** Market snapshot for a card (from `/v1/cards/:id/market`). */
export interface CardMarket {
  raw?: Money;
  gradedAvg?: Money;
  popTop?: Money;
  popTotal?: number;
  changePct1y?: number;
  lastSaleAt?: string;
  primaryHouse?: string;
}

// ── Identity / auth (mirrors app/schemas/user.py + TokenPair) ──

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  /** True when the user is in the backend admin allowlist (drives portal access). */
  is_admin?: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  display_name?: string;
}

// ── Developer portal: careers + blog (mirrors app/schemas/portal.py) ──

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "internship";
export type JobStatus = "draft" | "open" | "closed";
export type ApplicationStatus =
  | "submitted"
  | "reviewing"
  | "interview"
  | "offer"
  | "hired"
  | "rejected"
  | "withdrawn";
export type BlogStatus = "draft" | "published";

/** A job posting. `status` drives public visibility (`open` only). */
export interface JobPosting {
  id: string;
  slug: string;
  title: string;
  team: string;
  location: string;
  employmentType: EmploymentType;
  summary: string;
  description: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

/** Create/update body for a job posting (all optional on update). */
export interface JobPostingInput {
  title?: string;
  team?: string;
  location?: string;
  employmentType?: EmploymentType;
  summary?: string;
  description?: string;
  status?: JobStatus;
  slug?: string;
}

/** One entry in an application's status/communication trail. */
export interface ApplicationEvent {
  id: string;
  status: ApplicationStatus;
  message?: string | null;
  notified: boolean;
  createdAt: string;
}

/** An application row (admin list/detail). */
export interface JobApplication {
  id: string;
  jobId: string;
  applicantName: string;
  applicantEmail: string;
  linkedinUrl?: string | null;
  resumeUrl?: string | null;
  coverLetter?: string | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  jobTitle?: string | null;
}

export interface JobApplicationDetail extends JobApplication {
  events: ApplicationEvent[];
}

/** Public response after applying — the reference the applicant tracks with. */
export interface ApplicationSubmitted {
  id: string;
  status: ApplicationStatus;
  jobTitle: string;
  createdAt: string;
}

/** An applicant's own view of their application + updates. */
export interface ApplicationTrack {
  id: string;
  jobTitle: string;
  applicantName: string;
  status: ApplicationStatus;
  createdAt: string;
  events: ApplicationEvent[];
}

/** Public application submission body. */
export interface ApplyInput {
  applicantName: string;
  applicantEmail: string;
  linkedinUrl?: string | null;
  resumeUrl?: string | null;
  coverLetter?: string | null;
}

/** Admin: advance an application and optionally notify the applicant. */
export interface ApplicationStatusUpdateInput {
  status: ApplicationStatus;
  message?: string | null;
  notify?: boolean;
}

/** A blog post. */
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tag: string;
  author: string;
  coverImageUrl?: string | null;
  readMinutes: number;
  status: BlogStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Admin: metrics + user management ──

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

// ── Scanner waitlist ──

export type WaitlistStatus = "waiting" | "invited" | "purchased" | "removed";

/** A Loupe Scanner waitlist signup (admin view). */
export interface WaitlistEntry {
  id: string;
  email: string;
  name?: string | null;
  interest?: string | null;
  referralSource?: string | null;
  /** Linked Loupe account, when the visitor was signed in at signup. */
  userId?: string | null;
  quantity: number;
  status: WaitlistStatus;
  createdAt: string;
  updatedAt: string;
}

/** Public response after joining the waitlist. */
export interface WaitlistJoined {
  id: string;
  email: string;
  status: WaitlistStatus;
  /** 1-based place in line among waiting signups. */
  position: number;
  createdAt: string;
}

/** Aggregate waitlist counts for social proof. */
export interface WaitlistStats {
  total: number;
  waiting: number;
}

/** Payload for the "Join the waitlist" checkout CTA. */
export interface WaitlistJoinInput {
  email: string;
  name?: string;
  interest?: string;
  referralSource?: string;
  quantity?: number;
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

/** A runtime feature toggle (admin view). */
export interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  enabled: boolean;
  updatedAt?: string | null;
}

export interface FeatureFlagCreateInput {
  key: string;
  label: string;
  description?: string | null;
  enabled?: boolean;
}

export interface FeatureFlagUpdateInput {
  label?: string;
  description?: string | null;
  enabled?: boolean;
}

/** Set a flag's enabled state by key, creating it if missing (inspect overlay). */
export interface FeatureFlagUpsertInput {
  enabled: boolean;
  label?: string;
  description?: string | null;
}

/** Public `{key: enabled}` map clients gate UI on. */
export type FlagMap = Record<string, boolean>;

/** Create/update body for a blog post (all optional on update). */
export interface BlogPostInput {
  title?: string;
  excerpt?: string;
  body?: string;
  tag?: string;
  author?: string;
  coverImageUrl?: string | null;
  readMinutes?: number;
  status?: BlogStatus;
  slug?: string;
}
