/** Search / browse / trending params + paginated result shapes. */

import type { CardSummary } from "./card.types";

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
