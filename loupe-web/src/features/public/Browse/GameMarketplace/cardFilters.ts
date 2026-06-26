/**
 * cardFilters — a small, composable library of the filter/sort patterns every
 * card marketplace leans on (price bands, rarity, set, query, value/name sorts).
 *
 * Everything here is a pure function over `CardSummary[]`, with zero React or
 * network coupling, so the same primitives power the rail catalog, the search
 * page, future "for you" feeds, and tests. Rails compose these into a `CardLens`
 * (where → sort → limit) and apply it to a fetched pool — which lets several
 * rails share one network request and just slice it differently.
 */
import type { CardSummary } from "@loupe/core";

/** Numeric market price of a card (USD amount), or `null` when unpriced. */
export const priceOf = (c: CardSummary): number | null => c.price?.amount ?? null;

// ──────────────────────────────────────────────────────────────────────────
// Predicates — the "filter cards in many patterns" primitives.
// ──────────────────────────────────────────────────────────────────────────
export type CardPredicate = (c: CardSummary) => boolean;

export const hasImage: CardPredicate = (c) => Boolean(c.imageUrl);
export const hasPrice: CardPredicate = (c) => {
  const p = priceOf(c);
  return p != null && p > 0;
};

export const priceUnder =
  (max: number): CardPredicate =>
  (c) => {
    const p = priceOf(c);
    return p != null && p <= max;
  };

export const priceOver =
  (min: number): CardPredicate =>
  (c) => {
    const p = priceOf(c);
    return p != null && p >= min;
  };

export const priceBetween =
  (lo: number, hi: number): CardPredicate =>
  (c) => {
    const p = priceOf(c);
    return p != null && p >= lo && p <= hi;
  };

/** Match any of the given rarities (case-insensitive, exact). */
export const inRarities = (...rarities: string[]): CardPredicate => {
  const set = new Set(rarities.map((r) => r.toLowerCase()));
  return (c) => Boolean(c.rarity && set.has(c.rarity.toLowerCase()));
};

/** Match a rarity by pattern, e.g. /secret|rainbow|illustration/i for chase pulls. */
export const rarityMatches =
  (re: RegExp): CardPredicate =>
  (c) =>
    Boolean(c.rarity && re.test(c.rarity));

export const inSet = (setName: string): CardPredicate => {
  const needle = setName.trim().toLowerCase();
  return (c) => c.setName.toLowerCase() === needle;
};

export const matchesQuery = (q: string): CardPredicate => {
  const needle = q.trim().toLowerCase();
  return (c) =>
    !needle ||
    c.name.toLowerCase().includes(needle) ||
    c.setName.toLowerCase().includes(needle);
};

// ──────────────────────────────────────────────────────────────────────────
// Predicate combinators.
// ──────────────────────────────────────────────────────────────────────────
export const all =
  (...preds: CardPredicate[]): CardPredicate =>
  (c) =>
    preds.every((p) => p(c));
export const any =
  (...preds: CardPredicate[]): CardPredicate =>
  (c) =>
    preds.some((p) => p(c));
export const not =
  (pred: CardPredicate): CardPredicate =>
  (c) =>
    !pred(c);

// ──────────────────────────────────────────────────────────────────────────
// Comparators — the "sort patterns".
// ──────────────────────────────────────────────────────────────────────────
export type CardComparator = (a: CardSummary, b: CardSummary) => number;

export const byPriceDesc: CardComparator = (a, b) =>
  (priceOf(b) ?? -Infinity) - (priceOf(a) ?? -Infinity);
export const byPriceAsc: CardComparator = (a, b) =>
  (priceOf(a) ?? Infinity) - (priceOf(b) ?? Infinity);
export const byName: CardComparator = (a, b) => a.name.localeCompare(b.name);

// ──────────────────────────────────────────────────────────────────────────
// Transforms.
// ──────────────────────────────────────────────────────────────────────────
export const dedupeById = (cards: CardSummary[]): CardSummary[] => {
  const seen = new Set<string>();
  const out: CardSummary[] = [];
  for (const c of cards) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
};

/**
 * A reusable "lens" over a card pool: optional filters, an optional sort, and an
 * optional cap. This is how the rail catalog turns one fetched pool into many
 * distinct rails without extra network calls.
 */
export interface CardLens {
  where?: CardPredicate[];
  sort?: CardComparator;
  limit?: number;
}

export const applyLens = (cards: CardSummary[], lens: CardLens): CardSummary[] => {
  let out = dedupeById(lens.where ? cards.filter(all(...lens.where)) : cards);
  if (lens.sort) out = [...out].sort(lens.sort);
  if (lens.limit != null) out = out.slice(0, lens.limit);
  return out;
};
