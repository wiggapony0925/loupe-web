import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { cx } from "@/lib/cx";
import { useRecentStore } from "@/stores/recentStore";
import { Link, useParams } from "react-router-dom";
import { Expand, ExternalLink, ScanLine, ScanSearch, ShieldCheck } from "lucide-react";
import {
  useCard,
  useMarket,
  useMarketplacePrices,
  usePriceHistory,
  useValuation,
  useCardSnapshot,
  useCardAttributes,
  CARD_CHART_RANGE_TO_BACKEND,
  type GradePrice,
  type Money,
} from "@loupe/core";
import {
  CardThumb,
  Panel,
  Badge,
  Button,
  CardPriceChart,
  Skeleton,
  NoteCard,
  Stat,
  Delta,
  SignInGate,
} from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { ScanButton } from "@/features/scan";
import { GradeSelector, tierLabel, type PriceTier } from "./GradeSelector/GradeSelector";
import { Card3DModal } from "./Card3DModal/Card3DModal";
import { CompareBar } from "./CompareBar/CompareBar";
import { RelatedPrints } from "./RelatedPrints/RelatedPrints";
import { MarketSignals, QuickStats, CostBasisStrip } from "./CardInsights/CardInsights";
import { OwnershipPanel } from "./OwnershipPanel/OwnershipPanel";
import { CardAnalyticsPanel } from "./CardAnalyticsPanel/CardAnalyticsPanel";
import { GradedPrices } from "./GradedPrices/GradedPrices";
import { RecentSold } from "./RecentSold/RecentSold";
import { ActiveAlerts, SetProgressForCard } from "./CardContext/CardContext";
import { AttributesPanel } from "./AttributesPanel/AttributesPanel";
import { NearbyListings } from "./NearbyListings/NearbyListings";
import { buildComparePresets } from "./compareTiers";
import { WatchlistButton } from "../WatchlistButton/WatchlistButton";
import { PriceAlertButton } from "../PriceAlertButton/PriceAlertButton";
import { AddToCollectionButton } from "@/features/collection";
import { useSetHref } from "@/hooks/useSetHref";
import { useLoupeNavigation } from "@/hooks/useLoupeNavigation";
import { formatMoney } from "@/lib/format";
import styles from "./ProductDetail.module.scss";

const CONFIDENCE_LABEL = [
  "Estimate",
  "Low confidence",
  "Good confidence",
  "High confidence",
];

/** "PSA 10" → nice label; "UNGRADED" → "Raw". */
function gradeLabel(g: GradePrice): string {
  return g.grade === "UNGRADED" ? "Raw" : g.grade;
}

function ValuationSignal({
  label,
  money,
  hint,
}: {
  label: string;
  money?: Money | null;
  hint: string;
}) {
  return (
    <div className={styles.signal}>
      <span className={styles.signal__label}>{label}</span>
      <span className={styles.signal__value}>
        {money ? formatMoney(money) : "—"}
      </span>
      <span className={styles.signal__hint}>{hint}</span>
    </div>
  );
}

/** Real marketplace search links for a card name. */
function marketplaces(name: string) {
  const q = encodeURIComponent(name);
  return [
    {
      source: "TCGplayer",
      href: `https://www.tcgplayer.com/search/all/product?q=${q}`,
    },
    { source: "eBay", href: `https://www.ebay.com/sch/i.html?_nkw=${q}` },
    {
      source: "PriceCharting",
      href: `https://www.pricecharting.com/search-products?q=${q}`,
    },
    {
      source: "Google Shopping",
      href: `https://www.google.com/search?tbm=shop&q=${q}`,
    },
  ];
}

/** Public product page (TCGplayer-style): identity, buy box, market history, marketplaces. */
export function ProductDetail() {
  const { openExternal } = useLoupeNavigation();
  const { user } = useAuth();
  const { id = "" } = useParams();
  const { data: card, isLoading, isError } = useCard(id);
  const { data: market } = useMarket(id);
  // Month series only for the buy-box change% fallback; the chart fetches
  // its own range-aware series.
  const { data: series } = usePriceHistory(
    id,
    CARD_CHART_RANGE_TO_BACKEND["1M"],
  );
  const { data: quotes } = useMarketplacePrices(id);
  const { data: valuation } = useValuation(id);
  const { data: snapshot } = useCardSnapshot(id);
  const { data: attributes } = useCardAttributes(id);
  const setHref = useSetHref(attributes?.tcg, card?.setName);
  const [tier, setTier] = useState<PriceTier>({ house: "raw" });

  // Record this card for the "Recently viewed" rail in search.
  const pushViewed = useRecentStore((s) => s.pushViewed);
  useEffect(() => {
    if (card)
      pushViewed({
        id: card.id,
        name: card.name,
        imageUrl: card.imageUrl,
        setName: card.setName,
        kind: "card",
      });
  }, [card, pushViewed]);
  const [compareKeys, setCompareKeys] = useState<string[]>([]);
  const [viewer, setViewer] = useState(false);
  // Grade-aware compare options derived from the current tier: pick PSA 7 and
  // the chips are BGS 7 / CGC 7 / TAG 7 / Raw; switch to PSA 8 and they all
  // re-grade to 8 (keys are per-house so a toggled chip stays on). Must stay
  // above the early returns below — all hooks run on every render.
  const comparePresets = useMemo(
    () => buildComparePresets(tier),
    // Recompute only when the house/grade actually change, not on every new
    // `tier` object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tier.house, tier.grade],
  );

  if (isLoading) return <ProductDetailSkeleton />;
  if (isError || !card) {
    return (
      <NoteCard
        title="Card not found"
        message="We couldn't resolve this card from the backend."
        action={
          <Button variant="secondary" size="sm">
            <Link to="/cards">Back to browse</Link>
          </Button>
        }
      />
    );
  }

  const changePct = series?.changePct ?? market?.changePct1y;
  const price = card.price ?? market?.raw;

  const toggleCompare = (key: string) =>
    setCompareKeys((keys) =>
      keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key],
    );
  const compareTiers = comparePresets.filter((p) =>
    compareKeys.includes(p.key),
  );

  const details: Array<[string, string]> = [
    [
      "Card Number / Rarity",
      [card.number, card.rarity].filter(Boolean).join(" / ") || "—",
    ],
    ["Set", card.setName || "—"],
    ["Year", card.year ? String(card.year) : "—"],
  ];

  // Real per-marketplace quotes when available; otherwise honest search exits.
  const marketRowsRaw =
    quotes && quotes.length > 0
      ? quotes.map((q) => ({
          label: q.label,
          subtitle: q.subtitle,
          price: q.price,
          href: q.url || q.searchUrl || "#",
          kind: q.kind,
        }))
      : marketplaces(card.name).map((m) => ({
          label: m.source,
          subtitle: "Search active listings",
          price: undefined as Money | undefined,
          href: m.href,
          kind: "market_price" as const,
        }));
  // Cheapest priced row first (then the rest), so the lowest live price leads
  // and feeds the buy box.
  const marketRows = [...marketRowsRaw].sort((a, b) => {
    const pa = a.price?.amount;
    const pb = b.price?.amount;
    if (pa != null && pb != null) return pa - pb;
    if (pa != null) return -1;
    if (pb != null) return 1;
    return 0;
  });
  const lowestLabel = marketRows.find((m) => m.price != null)?.label ?? null;
  const buyHref = marketRows[0]?.href ?? "#";

  return (
    <div className={styles.product}>
      <nav className={styles.product__crumbs}>
        <Link to="/cards">All Cards</Link>
        <span>›</span>
        {card.setName &&
          (setHref ? (
            <Link to={setHref}>{card.setName}</Link>
          ) : (
            <span>{card.setName}</span>
          ))}
        <span>›</span>
        <span className={styles["product__crumbs-current"]}>{card.name}</span>
      </nav>

      <div className={styles.product__hero}>
        <Panel padding="lg" className={styles.product__art}>
          <CardThumb src={card.imageUrl} alt={card.name} size="lg" />
          {card.imageUrl && (
            <button
              type="button"
              className={styles.product__expand}
              onClick={() => setViewer(true)}
              aria-label="View card in 3D"
            >
              <Expand size={16} />
            </button>
          )}
        </Panel>

        <div className={styles.product__info}>
          <h1 className={styles.product__title}>
            {card.name} — {card.setName}
          </h1>
          {card.rarity && <Badge tone="purple">{card.rarity}</Badge>}

          <dl className={styles.product__details}>
            {details.map(([k, v]) => (
              <div key={k} className={styles["product__detail-row"]}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Panel padding="lg" className={styles.product__buybox}>
          <span className={styles["product__buybox-label"]}>Market Price</span>
          <div className={styles["product__buybox-price"]}>
            <span>{price ? formatMoney(price) : "—"}</span>
            {changePct !== undefined && <Delta percent={changePct} />}
          </div>
          {market?.gradedAvg && (
            <p className={styles["product__buybox-sub"]}>
              Graded avg {formatMoney(market.gradedAvg)}
            </p>
          )}
          <a
            href={buyHref}
            target="_blank"
            rel="noreferrer"
            className={styles["product__buybox-cta"]}
            onClick={(e) => {
              e.preventDefault();
              void openExternal(buyHref);
            }}
          >
            <Button block size="lg" trailingIcon={<ExternalLink size={16} />}>
              View listings
            </Button>
          </a>
          <div className={styles["product__buybox-watch"]}>
            <WatchlistButton card={card} />
            <AddToCollectionButton card={card} />
            <PriceAlertButton card={card} currentPrice={price} />
          </div>
          <p className={styles["product__buybox-note"]}>
            Live prices from connected marketplaces.
          </p>
        </Panel>
      </div>

      {/* Phones: the buy box lives below the fold — pin price + add. */}
      <div className={styles.stickyBar}>
        <div className={styles.stickyBar__price}>
          <span>Market</span>
          <strong>{price ? formatMoney(price) : "—"}</strong>
        </div>
        <AddToCollectionButton card={card} block={false} />
      </div>

      {/* The signed-in owner's own copies (grade · graded? · cost/value/P-L).
          Renders nothing for guests, non-owners, or until /ownership ships. */}
      <OwnershipPanel cardId={card.id} />

      {valuation && (valuation.fairValue || valuation.grades.length > 0) && (
        <section className={styles.valuation}>
          <div className={styles.valuation__head}>
            <div>
              <h2 className={styles.product__h2}>Loupe Value</h2>
              <p className={styles.valuation__sub}>
                Our equilibrium estimate — where actual sold comps, live
                listings, and catalog prices meet. One honest number instead of
                a wall of figures.
              </p>
            </div>
            {valuation.fairValue && (
              <div className={styles.valuation__fair}>
                <span className={styles.valuation__amount}>
                  {formatMoney(valuation.fairValue)}
                </span>
                <span
                  className={styles.valuation__conf}
                  data-level={valuation.confidence}
                >
                  <ShieldCheck size={13} />{" "}
                  {CONFIDENCE_LABEL[valuation.confidence] ?? "Estimate"}
                </span>
              </div>
            )}
          </div>

          <div className={styles.valuation__signals}>
            <ValuationSignal
              label="Sold comps"
              money={valuation.signals.soldComps}
              hint="Actual recent sales"
            />
            <ValuationSignal
              label="Lowest listings"
              money={valuation.signals.listings}
              hint="Live asking prices"
            />
            <ValuationSignal
              label="Catalog market"
              money={valuation.signals.catalog}
              hint="Aggregated market"
            />
          </div>

          {valuation.grades.length > 0 && (
            <div className={styles.grades}>
              <h3 className={styles.grades__title}>Price by grade</h3>
              <div className={styles.grades__row}>
                {valuation.grades.map((g) => (
                  <div key={g.grade} className={styles.grade}>
                    <span className={styles.grade__label}>{gradeLabel(g)}</span>
                    <span className={styles.grade__price}>
                      {g.lastSale ? formatMoney(g.lastSale) : "—"}
                    </span>
                    <span className={styles.grade__meta}>
                      {g.deltaPct != null && (
                        <Delta percent={g.deltaPct} variant="arrow" />
                      )}
                      {g.salesCount > 0 && (
                        <span className={styles.grade__count}>
                          {g.salesCount} sold
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Derived market analytics — market cap, momentum, volatility, grade
          premium, ATH/ATL, liquidity. Server-composed; hidden until it loads. */}
      <CardAnalyticsPanel cardId={card.id} />

      <section className={styles.product__section}>
        <div className={styles.product__chart}>
          <div className={styles.product__chartHead}>
            <h2 className={styles.product__h2}>Price history</h2>
            <GradeSelector
              value={tier}
              onChange={setTier}
              rawBase={price?.amount}
              year={card.year}
            />
          </div>
          <Panel padding="lg">
            <CompareBar
              presets={comparePresets}
              selected={compareKeys}
              onToggle={toggleCompare}
            />
            <CardPriceChart
              cardId={card.id}
              cardName={tierLabel(tier)}
              height={300}
              house={tier.house}
              grade={tier.grade}
              compare={compareTiers}
            />
            <p className={styles["product__chart-note"]}>
              {compareTiers.length > 0 ? (
                <>
                  Comparing <strong>{tierLabel(tier)}</strong> against{" "}
                  {compareTiers.map((c) => c.label).join(", ")} — each tier is
                  its own coloured line. Tap a timeframe (1W–ALL) and drag to
                  scrub.
                </>
              ) : (
                <>
                  Showing <strong>{tierLabel(tier)}</strong> prices — switch
                  between Raw and the major grading companies above, or tap a
                  Compare chip to overlay another grade as a second line. Tap a
                  timeframe (1W–ALL) and drag to scrub; the line is green when
                  the period is up, red when down.
                </>
              )}
            </p>
          </Panel>
        </div>

        <div className={styles.product__points}>
          <h2 className={styles.product__h2}>Price Points</h2>
          <Panel padding="lg" className={styles["product__points-card"]}>
            {price && <Stat label="Market price" value={formatMoney(price)} />}
            {market?.gradedAvg && (
              <Stat
                label="Graded average"
                value={formatMoney(market.gradedAvg)}
              />
            )}
            {market?.popTotal !== undefined && (
              <Stat
                label="Population"
                value={market.popTotal.toLocaleString()}
              />
            )}
            {market?.changePct1y !== undefined && (
              <Stat
                label="1-year change"
                value={<Delta percent={market.changePct1y} />}
              />
            )}
          </Panel>
        </div>
      </section>

      {/* Live market signals + quick stats + owned-card P/L + active alerts.
          Gated on the snapshot so an empty cluster never leaves a double gap. */}
      {snapshot && (
        <div className={styles.product__insights}>
          <MarketSignals snapshot={snapshot} cardId={card.id} />
          <QuickStats snapshot={snapshot} cardId={card.id} />
          <CostBasisStrip cardId={card.id} marketAmount={price} />
          <ActiveAlerts cardId={card.id} cardName={card.name} />
        </div>
      )}

      {/* Guests see their would-be position zone as a sign-in invite. Signing in
          mints a nav key (this card + "add to collection") so they return here
          and the add form opens — the authed view shows cost basis / P/L / alerts
          in its place (CostBasisStrip + ActiveAlerts above). */}
      {!user && (
        <SignInGate
          title="Track this card in your vault"
          message="Sign in to add it to your collection, watch its price, and see your cost basis and P/L right here."
          intent="collection.add"
          card={{ id: card.id, title: card.name }}
        />
      )}

      {/* Verified per-house × grade prices (population + Δ). */}
      <GradedPrices snapshot={snapshot} />

      {/* Actual recent sold comps. */}
      <RecentSold cardId={card.id} />

      <section>
        <div className={styles["product__markets-head"]}>
          <h2 className={styles.product__h2}>Marketplaces</h2>
          <span className={styles["product__markets-sub"]}>
            Live lowest prices across connected marketplaces
          </span>
        </div>
        <div className={styles.product__markets}>
          {marketRows.map((m) => {
            const isLowest = m.label === lowestLabel;
            const hue = [...m.label].reduce(
              (h, c) => (h * 31 + c.charCodeAt(0)) % 360,
              0,
            );
            return (
              <a
                key={m.label}
                href={m.href}
                target="_blank"
                rel="noreferrer"
                className={cx(
                  styles["product__market-row"],
                  isLowest && styles["product__market-row--lowest"],
                )}
                onClick={(e) => {
                  e.preventDefault();
                  void openExternal(m.href);
                }}
              >
                <span
                  className={styles["product__market-glyph"]}
                  style={{ "--g": hue } as CSSProperties}
                  aria-hidden
                >
                  {m.label.charAt(0).toUpperCase()}
                </span>
                <div className={styles["product__market-id"]}>
                  <span className={styles["product__market-name"]}>
                    {m.label}
                    {isLowest && (
                      <span className={styles["product__market-low"]}>
                        Lowest
                      </span>
                    )}
                  </span>
                  {m.subtitle && (
                    <span className={styles["product__market-sub"]}>
                      {m.subtitle}
                    </span>
                  )}
                </div>
                <div className={styles["product__market-right"]}>
                  {m.price && (
                    <span className={styles["product__market-price"]}>
                      {formatMoney(m.price)}
                    </span>
                  )}
                  <span className={styles["product__market-cta"]}>
                    {m.kind === "listing" ? "Buy" : "View"}{" "}
                    <ExternalLink size={13} />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* Facebook Marketplace listings near the visitor (opt-in, geo-gated). */}
      <NearbyListings cardId={card.id} />

      {/* Per-game attributes (Pokédex / MTG oracle / YGO stats). */}
      <AttributesPanel cardId={card.id} />

      {/* Set-completion progress for this card's set (signed-in users). */}
      <SetProgressForCard setName={card.setName} />

      {/* Other prints of this card across sets/years (same name root). */}
      <RelatedPrints cardId={card.id} cardName={card.name} />

      {/* Loupe Grade — grading happens on-device via the app + Scanner. */}
      <section className={styles.gradeCta}>
        <div className={styles.gradeCta__body}>
          <span className={styles.gradeCta__eyebrow}>
            <ScanLine size={14} /> Loupe Grade
          </span>
          <h2 className={styles.gradeCta__title}>
            What would this card grade?
          </h2>
          <p className={styles.gradeCta__sub}>
            Loupe measures centering, edges, corners, and surface and predicts
            the PSA / BGS / CGC grade — scan {card.name} with the Loupe app or
            the Loupe Scanner to get an instant estimate and see what it's worth
            slabbed.
          </p>
          <div className={styles.gradeCta__actions}>
            <Link
              to="/grade"
              state={{
                card: {
                  id: card.id,
                  name: card.name,
                  imageUrl: card.imageUrl,
                  setName: card.setName,
                },
              }}
            >
              <Button variant="primary" size="lg" leadingIcon={<ScanSearch size={18} />}>
                Grade in playground
              </Button>
            </Link>
            <ScanButton label="Scan a card" size="lg" />
            <Link to="/scanner">
              <Button variant="secondary" size="lg">
                Get the Scanner
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {card.imageUrl && (
        <Card3DModal
          open={viewer}
          onOpenChange={setViewer}
          src={card.imageUrl}
          alt={card.name}
          title={card.name}
          subtitle={[card.setName, card.number].filter(Boolean).join(" · ")}
        />
      )}
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className={styles.product}>
      <Skeleton width={260} height={14} radius={6} />
      <div className={styles.product__hero}>
        {/* Art */}
        <Panel padding="lg" className={styles.product__art}>
          <Skeleton height={360} radius={12} />
        </Panel>
        {/* Identity */}
        <div className={styles.product__info}>
          <Skeleton width="80%" height={30} radius={8} />
          <div style={{ height: 12 }} />
          <Skeleton width={90} height={22} radius={999} />
          <div style={{ height: 20 }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                margin: "10px 0",
              }}
            >
              <Skeleton width={120} height={14} radius={6} />
              <Skeleton width={80} height={14} radius={6} />
            </div>
          ))}
        </div>
        {/* Buy box */}
        <Panel padding="lg" className={styles.product__buybox}>
          <Skeleton width={100} height={12} radius={6} />
          <div style={{ height: 10 }} />
          <Skeleton width={160} height={36} radius={8} />
          <div style={{ height: 18 }} />
          <Skeleton height={48} radius={12} />
          <div style={{ height: 10 }} />
          <Skeleton height={48} radius={12} />
        </Panel>
      </div>
      {/* Loupe Value */}
      <Skeleton height={180} radius={20} />
      {/* Chart */}
      <Skeleton height={300} radius={20} />
    </div>
  );
}
