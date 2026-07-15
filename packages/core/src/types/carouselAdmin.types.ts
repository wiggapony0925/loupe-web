/**
 * Admin carousel-registry types — the /admin/carousels control surface.
 *
 * Mirrors the backend `app/schemas/carousel.py` admin models: the checked-in
 * JSON registry merged with the operator's live kv_cache overrides, plus the
 * latest AI-designed shelves per game.
 */

import type { CarouselRecipe } from "./card.types";

/** One merged registry entry, annotated for the portal. */
export interface AdminCarouselRecipe extends CarouselRecipe {
  enabled: boolean;
  /** Games this shelf serves; null = every priced game. */
  games: string[] | null;
  /** "file" = checked-in registry entry; "custom" = operator-added. */
  origin: "file" | "custom";
  /** A file recipe with a live operator patch on it. */
  edited: boolean;
  /** A deleted file recipe — listed (restorable via reset) but never served. */
  removed: boolean;
}

/** Per-game serve preview for the portal. */
export interface AdminCarouselGame {
  id: string;
  label: string;
  catalogOnly: boolean;
  /** Enabled registry recipes that would serve for this game right now. */
  curatedCount: number;
  /** Shelf count of today's cached AI design, if one exists. */
  aiCount: number | null;
  /** What /v1/public/carousels would answer with right now. */
  activeSource: "ai" | "curated";
  /** Rail count of the cached resolved payload (what clients render), if warm. */
  resolvedRails: number | null;
}

/** Everything the /admin/carousels page renders in one call. */
export interface AdminCarouselsView {
  aiConfigured: boolean;
  aiEnabled: boolean;
  recipes: AdminCarouselRecipe[];
  games: AdminCarouselGame[];
  /** Latest AI-designed shelves per game (today's cache). */
  ai: Record<string, CarouselRecipe[]>;
}

/** Create payload — a full recipe plus the operator controls. */
export interface CarouselRecipeCreate {
  id: string;
  title: string;
  subtitle: string;
  source?: "value" | "trending" | "catalog";
  priceMin?: number | null;
  priceMax?: number | null;
  rarityPattern?: string | null;
  sort?: "price_desc" | "price_asc" | "name";
  limit?: number;
  minItems?: number;
  enabled?: boolean;
  games?: string[] | null;
}

/** Partial edit — only sent fields are patched (null games = all priced). */
export type CarouselRecipeUpdate = Partial<CarouselRecipeCreate>;
