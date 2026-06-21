/** Maps raw backend card payloads onto the web/mobile view models. */
import type {
  CardAttributes,
  CardListing,
  CardMarket,
  CardSummary,
  CardValuation,
  GradePrice,
  MarketHouseBlock,
  MarketHistorySeries,
  MarketSnapshot,
  MarketplaceQuote,
  CardSet,
  Money,
  NearbyListing,
  SealedHolding,
  SealedProduct,
  SetProgressRow,
  SoldComp,
} from "./types";
import type { PriceSeries } from "./types";

type RawMoney = { amount?: number; currency?: string } | null | undefined;

function money(m: RawMoney): Money | null {
  return m && typeof m.amount === "number"
    ? { amount: m.amount, currency: m.currency ?? "USD" }
    : null;
}

interface RawGradePrice {
  grade: string;
  house?: string | null;
  last_sale?: (RawMoney & { sold_at?: string | null; url?: string | null }) | null;
  median_recent?: number | null;
  sales_count?: number;
  delta_pct?: number | null;
}

interface RawValuation {
  card_id: string;
  fair_value?: RawMoney;
  confidence?: number;
  signals?: { sold_comps?: RawMoney; listings?: RawMoney; catalog?: RawMoney };
  grades?: RawGradePrice[];
}

/** `/cards/{id}/valuation` payload → Loupe Value view model. */
export function toCardValuation(d: RawValuation): CardValuation {
  const toGrade = (g: RawGradePrice): GradePrice => ({
    grade: g.grade,
    house: g.house ?? null,
    lastSale: money(g.last_sale),
    lastSaleAt: g.last_sale?.sold_at ?? null,
    lastSaleUrl: g.last_sale?.url ?? null,
    medianRecent:
      typeof g.median_recent === "number"
        ? { amount: g.median_recent, currency: money(g.last_sale)?.currency ?? "USD" }
        : null,
    salesCount: g.sales_count ?? 0,
    deltaPct: g.delta_pct ?? null,
  });
  return {
    cardId: d.card_id,
    fairValue: money(d.fair_value),
    confidence: d.confidence ?? 0,
    signals: {
      soldComps: money(d.signals?.sold_comps),
      listings: money(d.signals?.listings),
      catalog: money(d.signals?.catalog),
    },
    grades: (d.grades ?? []).map(toGrade),
  };
}

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

// ─── Full market snapshot (houses + history + summary) ──────────────────

interface RawHistory {
  points?: Array<{ price?: number; ts?: string }>;
  summary?: {
    min?: number | null;
    max?: number | null;
    avg?: number | null;
    current?: number | null;
    change_pct?: number | null;
    n_points?: number;
  };
}
interface RawGradeRow {
  house?: string;
  grade?: number;
  grade_label?: string;
  population?: number;
  market?: RawMoney;
  change_pct?: number;
  last_sale_at?: string | null;
  listing_url?: string | null;
  source?: string;
}
interface RawHouseBlock {
  house?: string;
  pop_total?: number;
  grades?: RawGradeRow[];
}
interface RawSnapshot {
  summary?: ApiMarketSummary;
  history?: Record<string, RawHistory>;
  houses?: RawHouseBlock[];
  tiers_total?: number;
}

/** `/cards/{id}/market` envelope → full snapshot (houses, history, summary). */
export function toMarketSnapshot(data: { snapshot?: RawSnapshot }): MarketSnapshot | null {
  const s = data.snapshot;
  if (!s) return null;
  const sum = s.summary ?? {};

  const history: Record<string, MarketHistorySeries> = {};
  for (const [key, h] of Object.entries(s.history ?? {})) {
    history[key] = {
      points: (h.points ?? [])
        .filter((p) => typeof p.price === "number")
        .map((p) => ({
          t: p.ts ? Date.parse(p.ts) : Number.NaN,
          price: p.price as number,
        })),
      summary: {
        min: h.summary?.min ?? null,
        max: h.summary?.max ?? null,
        avg: h.summary?.avg ?? null,
        current: h.summary?.current ?? null,
        changePct: h.summary?.change_pct ?? null,
        nPoints: h.summary?.n_points ?? 0,
      },
    };
  }

  const houses: MarketHouseBlock[] = (s.houses ?? []).map((b) => ({
    house: b.house ?? "",
    popTotal: b.pop_total ?? 0,
    grades: (b.grades ?? []).map((g) => ({
      house: g.house ?? b.house ?? "",
      grade: g.grade ?? 0,
      gradeLabel: g.grade_label ?? String(g.grade ?? ""),
      population: g.population ?? 0,
      market: money(g.market) ?? { amount: 0, currency: "USD" },
      changePct: g.change_pct ?? 0,
      lastSaleAt: g.last_sale_at ?? null,
      listingUrl: g.listing_url ?? null,
      source: g.source,
    })),
  }));

  return {
    summary: {
      raw: sum.raw ?? null,
      gradedAvg: sum.graded_avg ?? null,
      popTop: sum.pop_top ?? null,
      popTotal: sum.pop_total ?? 0,
      changePct1y: sum.change_pct_1y ?? 0,
      lastSaleAt: sum.last_sale_at ?? null,
      primaryHouse: sum.primary_house,
    },
    history,
    houses,
    tiersTotal: s.tiers_total ?? 0,
  };
}

// ─── Sold comps / listings / nearby ─────────────────────────────────────

interface RawComp {
  source?: string;
  title?: string;
  price?: RawMoney;
  sold_at?: string;
  condition?: string | null;
  grade?: string | null;
  house?: string | null;
  url?: string | null;
  image_url?: string | null;
}

/** `/cards/{id}/comps` → recent sold comps. */
export function toSoldComps(data: { comps?: RawComp[] }): SoldComp[] {
  const out: SoldComp[] = [];
  for (const c of data.comps ?? []) {
    const price = money(c.price);
    if (!price) continue;
    out.push({
      source: c.source ?? "",
      title: c.title ?? "",
      price,
      soldAt: c.sold_at ?? "",
      condition: c.condition ?? null,
      grade: c.grade ?? null,
      house: c.house ?? null,
      url: c.url ?? null,
      imageUrl: c.image_url ?? null,
    });
  }
  return out;
}

interface RawListing {
  source?: string;
  title?: string;
  price?: RawMoney;
  url?: string;
  condition?: string | null;
  image_url?: string | null;
  is_auction?: boolean;
  time_left_seconds?: number | null;
  distance_km?: number | null;
  location_label?: string | null;
}

/** `/cards/{id}/listings` → live for-sale listings. */
export function toCardListings(data: { listings?: RawListing[] }): CardListing[] {
  const out: CardListing[] = [];
  for (const l of data.listings ?? []) {
    const price = money(l.price);
    if (!price || !l.url) continue;
    out.push({
      source: l.source ?? "",
      title: l.title ?? "",
      price,
      url: l.url,
      condition: l.condition ?? null,
      imageUrl: l.image_url ?? null,
      isAuction: Boolean(l.is_auction),
      timeLeftSeconds: l.time_left_seconds ?? null,
    });
  }
  return out;
}

/** `/cards/{id}/nearby-listings` → nearby Facebook Marketplace listings. */
export function toNearbyListings(data: { listings?: RawListing[] }): NearbyListing[] {
  const out: NearbyListing[] = [];
  for (const l of data.listings ?? []) {
    const price = money(l.price);
    if (!price || !l.url) continue;
    out.push({
      source: l.source ?? "facebook",
      title: l.title ?? "",
      price,
      url: l.url,
      condition: l.condition ?? null,
      imageUrl: l.image_url ?? null,
      distanceKm: l.distance_km ?? null,
      locationLabel: l.location_label ?? null,
    });
  }
  return out;
}

// ─── Set progress (this endpoint emits camelCase already) ───────────────

interface RawSetProgress {
  setId?: string;
  setName?: string;
  imageUrl?: string | null;
  owned?: number;
  total?: number;
  percent?: number;
  estimatedValueUsd?: number;
  missingTop?: Array<{ cardId?: string; name?: string; imageUrl?: string | null }>;
}

interface RawCardSet {
  id?: string;
  code?: string | null;
  name?: string;
  tcg?: string;
  image_url?: string | null;
  release_date?: string | null;
  total_cards?: number | null;
}

/** `/sets` row → CardSet view model. */
export function toCardSet(r: RawCardSet): CardSet {
  return {
    id: r.id ?? "",
    code: r.code ?? undefined,
    name: r.name ?? "Set",
    tcg: r.tcg ?? "",
    imageUrl: r.image_url ?? null,
    releaseDate: r.release_date ?? null,
    totalCards: r.total_cards ?? null,
  };
}

/** `/sets/progress` → per-set completion rows. */
export function toSetProgress(rows: RawSetProgress[]): SetProgressRow[] {
  return (rows ?? []).map((r) => ({
    setId: r.setId ?? "",
    setName: r.setName ?? "",
    imageUrl: r.imageUrl ?? null,
    owned: r.owned ?? 0,
    total: r.total ?? 0,
    percent: r.percent ?? 0,
    estimatedValueUsd: r.estimatedValueUsd,
    missingTop: (r.missingTop ?? []).map((m) => ({
      cardId: m.cardId ?? "",
      name: m.name ?? "",
      imageUrl: m.imageUrl ?? null,
    })),
  }));
}

// ─── Canonical per-game attributes ──────────────────────────────────────

interface RawCanonicalAttrs {
  types?: string[] | null;
  hp?: number | null;
  mana_cost?: string | null;
  type_line?: string | null;
  oracle_text?: string | null;
  [extra: string]: unknown;
}

/** Render a primitive attribute value (string/number/bool/array) → string. */
function attrPrimitive(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) {
    const items = v
      .map((x) => (typeof x === "string" || typeof x === "number" ? String(x) : null))
      .filter((x): x is string => !!x);
    return items.length ? items.join(" · ") : null;
  }
  return null;
}

const ATTR_HANDLED = new Set([
  "types",
  "hp",
  "mana_cost",
  "type_line",
  "oracle_text",
  "abilities",
  "attacks",
  "rules",
  "rulings",
  "desc",
  "card_text",
  "flavor_text",
]);

/** `/cards/{id}/canonical` → per-game attributes (or null when none). */
export function toCardAttributes(data: {
  identity?: { name?: string; tcg?: string };
  attributes?: RawCanonicalAttrs | null;
}): CardAttributes | null {
  const a = data.attributes;
  if (!a) return null;
  const extra: Record<string, string> = {};
  for (const [k, v] of Object.entries(a)) {
    if (ATTR_HANDLED.has(k)) continue;
    if (/url$|uri$|_id$|^id$/i.test(k)) continue; // skip links / opaque ids
    const f = attrPrimitive(v);
    if (!f) continue;
    if (/^https?:\/\//i.test(f) || f.length > 48) continue; // skip URLs / essays
    extra[k] = f;
  }
  const result: CardAttributes = {
    tcg: data.identity?.tcg ?? "",
    name: data.identity?.name ?? "",
    types: a.types ?? null,
    hp: a.hp ?? null,
    manaCost: a.mana_cost ?? null,
    typeLine: a.type_line ?? null,
    oracleText: a.oracle_text ?? null,
    extra,
  };
  // Nothing useful to show?
  const hasContent =
    (result.types && result.types.length) ||
    result.hp != null ||
    result.manaCost ||
    result.typeLine ||
    result.oracleText ||
    Object.keys(extra).length > 0;
  return hasContent ? result : null;
}

// ─── Sealed products + holdings ─────────────────────────────────────────

/** Decimal-string | number | null → Money (USD), or null. */
function usdMoney(v: string | number | null | undefined): Money | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? { amount: n, currency: "USD" } : null;
}

interface RawSealedProduct {
  id?: string;
  tcg?: string;
  product_type?: string;
  set_id?: string | null;
  name?: string;
  set_name?: string | null;
  image_url?: string | null;
  msrp_usd?: string | number | null;
  release_date?: string | null;
}

/** `/sealed/search` row → SealedProduct view model. */
export function toSealedProduct(r: RawSealedProduct): SealedProduct {
  return {
    id: r.id ?? "",
    tcg: r.tcg ?? "",
    productType: r.product_type ?? "other",
    setId: r.set_id ?? null,
    name: r.name ?? "Sealed product",
    setName: r.set_name ?? null,
    imageUrl: r.image_url ?? null,
    msrp: usdMoney(r.msrp_usd),
    releaseDate: r.release_date ?? null,
  };
}

interface RawSealedHolding {
  id?: string;
  product_id?: string;
  quantity?: number;
  purchase_price_usd?: string | number | null;
  purchase_date?: string | null;
  estimated_value_usd?: string | number | null;
  notes?: string | null;
  opened_at?: string | null;
  acquired_at?: string;
  product_name?: string | null;
  product_image_url?: string | null;
  product_type?: string | null;
  product_tcg?: string | null;
  product_set_name?: string | null;
}

/** `/sealed-holdings` row → SealedHolding view model. */
export function toSealedHolding(r: RawSealedHolding): SealedHolding {
  return {
    id: r.id ?? "",
    productId: r.product_id ?? "",
    quantity: r.quantity ?? 1,
    purchasePrice: usdMoney(r.purchase_price_usd),
    purchaseDate: r.purchase_date ?? null,
    estimatedValue: usdMoney(r.estimated_value_usd),
    notes: r.notes ?? null,
    openedAt: r.opened_at ?? null,
    acquiredAt: r.acquired_at ?? "",
    productName: r.product_name ?? null,
    productImageUrl: r.product_image_url ?? null,
    productType: r.product_type ?? null,
    productTcg: r.product_tcg ?? null,
    productSetName: r.product_set_name ?? null,
  };
}
