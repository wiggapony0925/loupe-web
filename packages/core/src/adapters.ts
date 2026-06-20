/** Maps raw backend card payloads onto the web/mobile view models. */
import type { CardMarket, CardSummary, MarketplaceQuote, Money, PriceSeries } from "./types";

interface RawQuote {
  source?: string;
  label?: string;
  kind?: string;
  price?: { amount?: number; currency?: string } | null;
  url?: string | null;
  search_url?: string | null;
  subtitle?: string | null;
  is_auction?: boolean;
}

/** `/marketplace-prices` payload → per-marketplace quotes (live prices + links). */
export function toMarketplaceQuotes(data: { providers?: RawQuote[] }): MarketplaceQuote[] {
  return (data.providers ?? []).map((p) => ({
    source: p.source ?? "",
    label: p.label ?? p.source ?? "Marketplace",
    kind: p.kind === "listing" ? "listing" : "market_price",
    price:
      p.price && typeof p.price.amount === "number"
        ? { amount: p.price.amount, currency: p.price.currency ?? "USD" }
        : undefined,
    url: p.url ?? undefined,
    searchUrl: p.search_url ?? undefined,
    subtitle: p.subtitle ?? undefined,
    isAuction: Boolean(p.is_auction),
  }));
}

interface ApiImage {
  url: string;
}
interface ApiImages {
  small?: ApiImage;
  normal?: ApiImage;
  large?: ApiImage;
}
interface ApiPricingSummary {
  market?: Money;
  low?: Money;
  mid?: Money;
  high?: Money;
}
export interface ApiCard {
  id: string;
  name: string;
  set_name?: string;
  number?: string;
  rarity?: string;
  year?: number;
  image_url?: string;
  images?: ApiImages;
  pricing_summary?: ApiPricingSummary;
  set?: { name?: string };
}

/** Pick the crispest available art for a card. */
function bestImage(c: { images?: ApiImages; image_url?: string }): string {
  return c.images?.large?.url ?? c.images?.normal?.url ?? c.image_url ?? "";
}

/** Raw backend card → list/grid view model. */
export function toCardSummary(c: ApiCard): CardSummary {
  return {
    id: c.id,
    name: c.name,
    setName: c.set_name ?? c.set?.name ?? "",
    number: c.number,
    rarity: c.rarity,
    year: c.year,
    imageUrl: bestImage(c),
    price: c.pricing_summary?.market,
    low: c.pricing_summary?.low,
  };
}

/** Price-history points → series + parallel timestamps + derived change. */
export function toPriceSeries(data: {
  currency?: string;
  points?: Array<{ price: number; ts?: string }>;
}): PriceSeries {
  const raw = (data.points ?? []).filter((p) => typeof p.price === "number");
  const points = raw.map((p) => p.price);
  const at = raw.map((p) => (p.ts ? Date.parse(p.ts) : Number.NaN));
  const first = points[0] ?? 0;
  const last = points[points.length - 1] ?? 0;
  const changePct = first ? ((last - first) / first) * 100 : 0;
  return { points, at, currency: data.currency ?? "USD", changePct };
}

interface ApiMarketSummary {
  raw?: Money;
  graded_avg?: Money;
  pop_top?: Money;
  pop_total?: number;
  change_pct_1y?: number;
  last_sale_at?: string;
  primary_house?: string;
}

/** Market snapshot envelope → CardMarket view model. */
export function toCardMarket(data: { snapshot?: { summary?: ApiMarketSummary } }): CardMarket {
  const s = data.snapshot?.summary ?? {};
  return {
    raw: s.raw,
    gradedAvg: s.graded_avg,
    popTop: s.pop_top,
    popTotal: s.pop_total,
    changePct1y: s.change_pct_1y,
    lastSaleAt: s.last_sale_at,
    primaryHouse: s.primary_house,
  };
}

/** Canonical card envelope → list/grid view model. */
export function canonicalToSummary(
  id: string,
  data: {
    identity?: { name?: string; number?: string; rarity?: string; year?: number };
    set?: { name?: string };
    images?: ApiImages;
    image_url?: string;
    pricing_summary?: ApiPricingSummary;
  },
): CardSummary {
  return {
    id,
    name: data.identity?.name ?? "Unknown card",
    setName: data.set?.name ?? "",
    number: data.identity?.number,
    rarity: data.identity?.rarity,
    year: data.identity?.year,
    imageUrl: bestImage(data),
    price: data.pricing_summary?.market,
  };
}
