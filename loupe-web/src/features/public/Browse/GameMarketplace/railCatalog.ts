/**
 * railCatalog — the `RailSpec` type the marketplace renders.
 *
 * A `RailSpec` is the compiled, ready-to-render shape of one carousel. They are
 * produced by `composeGameRails` (carouselRecipes.ts), which bookends a couple
 * of fixed anchors around a seed-shuffled, AI-enrichable strategy pool — so the
 * storefront varies per visit. Every spec declares `minItems` and **self-hides**
 * when its slice is thin, so the same engine serves a data-rich game
 * (Pokémon/Magic/Yu-Gi-Oh!) and a catalog-only one (One Piece/Digimon) with no
 * per-game branching. `MarketplaceRail` dispatches a spec to its kind-specific
 * renderer.
 */
import type { CardLens } from "./cardFilters";

/** Server-side slice a card rail pulls before any client lens is applied. */
export interface CardFetch {
  sort: "trending" | "value";
  maxPrice?: number;
  limit?: number;
}

export type RailSpec =
  | {
      kind: "cards";
      id: string;
      title: string;
      subtitle: string;
      fetch: CardFetch;
      lens?: CardLens;
      minItems?: number;
    }
  | {
      kind: "catalog";
      id: string;
      title: string;
      subtitle: string;
      /** Browse sort for the slice (newest works for priced games; catalog-only
       *  games fall back to their natural order). */
      sort?: "name" | "newest" | "price_desc";
      limit?: number;
      minItems?: number;
    }
  | {
      kind: "sets";
      id: string;
      title: string;
      subtitle: string;
      minItems?: number;
    }
  | {
      kind: "sealed";
      id: string;
      title: string;
      subtitle: string;
      /** SealedProductTypeEnum value, e.g. "booster_box" | "etb"; omit for all. */
      productType?: string;
      minItems?: number;
    };
