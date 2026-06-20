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
