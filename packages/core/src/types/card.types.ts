/** Card entities: summaries, valuation, grade ladder, market, scan. */

import type { Money } from "./money.types";

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
  /** Server refused paid OCR (Vision budget exhausted) — the client should OCR
   *  on-device and resubmit via `identifyText`. Candidates will be empty. */
  fallbackRequired?: boolean;
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

/**
 * A serializable marketplace-carousel definition (a "recipe"): a theme + copy +
 * a constrained filter vocabulary. Authored by the AI generator (or a curated
 * pool) and compiled into a real rail on the web. Mirrors the backend
 * `CarouselRecipe` schema.
 */
export interface CarouselRecipe {
  id: string;
  title: string;
  subtitle: string;
  source: "value" | "trending" | "catalog";
  priceMin?: number;
  priceMax?: number;
  rarityPattern?: string;
  rarities?: string[];
  sort?: "price_desc" | "price_asc" | "name";
  limit?: number;
  minItems?: number;
}

/** A game's generated shelves + whether the model produced them. */
export interface CarouselResponse {
  game: string;
  source: "ai" | "curated";
  carousels: CarouselRecipe[];
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

// ─── Full market snapshot (houses + history + summary) ──────────────────
// Powers the card-detail graded-prices rows, market signals, and quick stats.

/** One (house, grade) tier with population, market price, and 30d change. */
export interface MarketGradeRow {
  house: string;
  grade: number;
  gradeLabel: string;
  population: number;
  market: Money;
  changePct: number;
  lastSaleAt?: string | null;
  listingUrl?: string | null;
  /** "real" comps vs "synthesized" estimate. */
  source?: "real" | "synthesized" | string;
}

/** A grading house with its total population and per-grade rows. */
export interface MarketHouseBlock {
  house: string;
  popTotal: number;
  grades: MarketGradeRow[];
}

/** A history bucket (e.g. "30d", "90d", "1y") with points + derived summary. */
export interface MarketHistorySeries {
  /** Oldest → newest. `t` is epoch-ms. */
  points: Array<{ t: number; price: number }>;
  summary: {
    min: number | null;
    max: number | null;
    avg: number | null;
    current: number | null;
    changePct: number | null;
    nPoints: number;
  };
}

export interface MarketSnapshot {
  summary: {
    raw?: Money | null;
    gradedAvg?: Money | null;
    popTop?: Money | null;
    popTotal: number;
    changePct1y: number;
    lastSaleAt?: string | null;
    primaryHouse?: string;
  };
  /** Keyed by range bucket ("30d" | "90d" | "1y" | …). */
  history: Record<string, MarketHistorySeries>;
  houses: MarketHouseBlock[];
  tiersTotal: number;
}

/** A recent sold comp (from `/v1/cards/:id/comps`). */
export interface SoldComp {
  source: string;
  title: string;
  price: Money;
  soldAt: string;
  condition?: string | null;
  grade?: string | null;
  house?: string | null;
  url?: string | null;
  imageUrl?: string | null;
}

/** A live for-sale listing (from `/v1/cards/:id/listings`). */
export interface CardListing {
  source: string;
  title: string;
  price: Money;
  url: string;
  condition?: string | null;
  imageUrl?: string | null;
  isAuction: boolean;
  timeLeftSeconds?: number | null;
}

/** A nearby Facebook Marketplace listing (from `/v1/cards/:id/nearby-listings`). */
export interface NearbyListing {
  source: string;
  title: string;
  price: Money;
  url: string;
  condition?: string | null;
  imageUrl?: string | null;
  distanceKm?: number | null;
  locationLabel?: string | null;
}

/** Per-set completion progress for the signed-in user (from `/v1/sets/progress`). */
export interface SetProgressRow {
  setId: string;
  setName: string;
  imageUrl?: string | null;
  owned: number;
  total: number;
  /** 0–100. */
  percent: number;
  estimatedValueUsd?: number;
  missingTop: Array<{ cardId: string; name: string; imageUrl?: string | null }>;
}

/** Per-game attributes from the canonical card (Pokédex / MTG / YGO). */
/** One owned copy of a card (a graded-card row), with derived figures. */
export interface CardHolding {
  holdingId: string;
  grade: number;
  house: string;
  isGraded: boolean;
  condition?: string | null;
  subgrades?: Record<string, unknown> | null;
  estimatedValueUsd?: number | null;
  purchasePriceUsd?: number | null;
  purchaseDate?: string | null;
  acquiredVia?: "scan" | "manual" | "import" | null;
  scanJobId?: string | null;
  notes?: string | null;
  gradedAt: string;
  daysHeld?: number | null;
  unrealizedPlUsd?: number | null;
  unrealizedPlPct?: number | null;
}

/** The signed-in user's ownership of one card (rolled up across copies). */
export interface CardOwnership {
  owned: boolean;
  copies: number;
  holdings: CardHolding[];
  costBasisUsd?: number | null;
  holdingValueUsd?: number | null;
  unrealizedPlUsd?: number | null;
  unrealizedPlPct?: number | null;
}

/** Derived market analytics for a card (public) — figures composed server-side
 *  from the market snapshot + comps so every client shows the same numbers. */
export interface CardAnalytics {
  cardId: string;
  // Valuation
  marketPriceUsd?: number | null;
  gradedAvgUsd?: number | null;
  population: number;
  /** Value of the whole graded population (graded avg × population). */
  marketCapUsd?: number | null;
  // Momentum — signed % change over each trailing window
  momentum7d?: number | null;
  momentum30d?: number | null;
  momentum90d?: number | null;
  momentum1y?: number | null;
  // Risk & quality
  /** 90-day coefficient of variation (stdev ÷ mean, as %). */
  volatilityPct?: number | null;
  /** Top-grade ÷ raw price (e.g. 8.2 = top slab worth 8.2× the raw card). */
  gradePremium?: number | null;
  // Extremes (all-time within available history)
  allTimeHighUsd?: number | null;
  allTimeLowUsd?: number | null;
  /** Current vs ATH, signed % (≤ 0 = below the peak). */
  pctOffAth?: number | null;
  // Liquidity
  /** Count of sold comps in the trailing 30 days. */
  liquidity30d: number;
}

/** A Pokémon attack: energy cost (type symbols), damage, and effect text. */
export interface CardAttack {
  name: string;
  /** Energy types making up the cost, e.g. ["Fire","Fire","Colorless"]. */
  cost?: string[] | null;
  damage?: string | null;
  text?: string | null;
}

/** A Pokémon ability / Poké-Body / Poké-Power. */
export interface CardAbility {
  name: string;
  text?: string | null;
  /** "Ability" | "Poké-Body" | "Poké-Power" | … */
  type?: string | null;
}

/** A typed modifier — weakness or resistance (e.g. type "Water", value "+40"). */
export interface CardTypeModifier {
  type: string;
  value?: string | null;
}

export interface CardAttributes {
  tcg: string;
  name: string;
  types?: string[] | null;
  hp?: number | null;
  manaCost?: string | null;
  typeLine?: string | null;
  oracleText?: string | null;
  // ── Structured combat / flavor block (Pokémon today; null when absent) ──
  supertype?: string | null;
  subtypes?: string[] | null;
  evolvesFrom?: string | null;
  abilities?: CardAbility[] | null;
  attacks?: CardAttack[] | null;
  weaknesses?: CardTypeModifier[] | null;
  resistances?: CardTypeModifier[] | null;
  /** Energy types of the retreat cost (length = converted retreat cost). */
  retreatCost?: string[] | null;
  artist?: string | null;
  flavorText?: string | null;
  /** Any extra primitive provider fields, for a generic fallback table. */
  extra: Record<string, string>;
}
