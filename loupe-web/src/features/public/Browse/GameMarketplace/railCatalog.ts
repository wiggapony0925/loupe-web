/**
 * railCatalog — the single, declarative source of truth for every marketplace
 * carousel. One ordered list of `RailSpec`s fans out into many rails for ANY
 * game; adding a rail is a one-line entry here, not a new component.
 *
 * Design notes that make this scale:
 *  - **Self-hiding.** Every rail declares `minItems`; a rail whose slice comes
 *    back thin simply doesn't render. So the same catalog serves a data-rich
 *    game (Pokémon/Magic/Yu-Gi-Oh!) and a sparse one without per-game branching.
 *  - **Shared fetches.** Card rails declare a server `fetch` plus an optional
 *    client `lens` (from cardFilters). Rails with identical `fetch` params hit
 *    one deduped React Query cache entry, so e.g. "Most valuable", "Premium",
 *    and "Collector picks" all derive from a single value-pool request.
 */
import {
  priceOver,
  priceBetween,
  byPriceDesc,
  type CardLens,
} from "./cardFilters";

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

/**
 * Build the ordered rail catalog for a game. `label` is the display name
 * (e.g. "Pokémon"). Rails self-hide where their slice is empty, so the order is
 * "best foot forward": momentum → value tiers → budget → sets → sealed. Every
 * game shares this catalog today; branch here if a game ever needs its own set.
 */
export function buildGameRails(label: string): RailSpec[] {
  return [
    {
      kind: "cards",
      id: "trending",
      title: `Trending in ${label}`,
      subtitle: `The ${label} cards moving most across connected marketplaces.`,
      fetch: { sort: "trending", limit: 24 },
      minItems: 4,
    },
    {
      kind: "cards",
      id: "valuable",
      title: `Most valuable ${label}`,
      subtitle: `The priciest ${label} cards in today's live market.`,
      // Value pool shared with the two rails below — fetched once, sliced thrice.
      fetch: { sort: "value", limit: 24 },
      lens: { sort: byPriceDesc, limit: 20 },
      minItems: 4,
    },
    {
      kind: "cards",
      id: "premium",
      title: "Premium chase cards",
      subtitle: "Grails for serious collectors.",
      fetch: { sort: "value", limit: 24 },
      lens: { where: [priceOver(150)], sort: byPriceDesc, limit: 20 },
      minItems: 4,
    },
    {
      kind: "cards",
      id: "midrange",
      title: "Collector picks · $25–$150",
      subtitle: "Standout cards that won't break the bank.",
      fetch: { sort: "value", limit: 24 },
      lens: { where: [priceBetween(25, 150)], sort: byPriceDesc, limit: 20 },
      minItems: 4,
    },
    {
      kind: "cards",
      id: "under25",
      title: "Great finds under $25",
      subtitle: "Quality pickups, priced live.",
      fetch: { sort: "value", maxPrice: 25, limit: 30 },
      lens: { limit: 20 },
      minItems: 4,
    },
    {
      kind: "cards",
      id: "under5",
      title: "Steals under $5",
      subtitle: `Affordable ${label} pickups.`,
      fetch: { sort: "value", maxPrice: 5, limit: 24 },
      minItems: 4,
    },
    {
      kind: "sets",
      id: "sets",
      title: `Shop ${label} sets`,
      subtitle: `Browse ${label} by set — every release, with live card counts.`,
      minItems: 1,
    },
    {
      kind: "sealed",
      id: "sealed",
      title: `Sealed ${label} products`,
      subtitle: "Booster boxes, ETBs, and bundles — tracked like singles.",
      minItems: 1,
    },
    {
      kind: "sealed",
      id: "boxes",
      title: `${label} booster boxes`,
      subtitle: "Sealed boxes at live market value.",
      productType: "booster_box",
      minItems: 3,
    },
    {
      kind: "sealed",
      id: "etb",
      title: "Elite Trainer Boxes",
      subtitle: "ETBs tracked like singles.",
      productType: "etb",
      minItems: 3,
    },
  ];
}
