import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink, ScanLine, ShieldCheck } from "lucide-react";
import {
  useCard,
  useMarket,
  useMarketplacePrices,
  usePriceHistory,
  useValuation,
  CARD_CHART_RANGE_TO_BACKEND,
  type GradePrice,
  type Money,
} from "@loupe/core";
import { CardThumb, Panel, Badge, Button, CardPriceChart, Skeleton, NoteCard, Stat, Delta } from "@/components";
import { ScanButton } from "@/features/scan";
import { GradeSelector, tierLabel, type PriceTier } from "./GradeSelector";
import { WatchlistButton } from "../WatchlistButton/WatchlistButton";
import { AddToCollectionButton } from "@/features/collection";
import { formatMoney } from "@/lib/format";
import styles from "./ProductDetail.module.scss";

const CONFIDENCE_LABEL = ["Estimate", "Low confidence", "Good confidence", "High confidence"];

/** "PSA 10" → nice label; "UNGRADED" → "Raw". */
function gradeLabel(g: GradePrice): string {
  return g.grade === "UNGRADED" ? "Raw" : g.grade;
}

function ValuationSignal({ label, money, hint }: { label: string; money?: Money | null; hint: string }) {
  return (
    <div className={styles.signal}>
      <span className={styles.signal__label}>{label}</span>
      <span className={styles.signal__value}>{money ? formatMoney(money) : "—"}</span>
      <span className={styles.signal__hint}>{hint}</span>
    </div>
  );
}

/** Real marketplace search links for a card name. */
function marketplaces(name: string) {
  const q = encodeURIComponent(name);
  return [
    { source: "TCGplayer", href: `https://www.tcgplayer.com/search/all/product?q=${q}` },
    { source: "eBay", href: `https://www.ebay.com/sch/i.html?_nkw=${q}` },
    { source: "PriceCharting", href: `https://www.pricecharting.com/search-products?q=${q}` },
    { source: "Google Shopping", href: `https://www.google.com/search?tbm=shop&q=${q}` },
  ];
}

/** Public product page (TCGplayer-style): identity, buy box, market history, marketplaces. */
export function ProductDetail() {
  const { id = "" } = useParams();
  const { data: card, isLoading, isError } = useCard(id);
  const { data: market } = useMarket(id);
  // Month series only for the buy-box change% fallback; the chart fetches
  // its own range-aware series.
  const { data: series } = usePriceHistory(id, CARD_CHART_RANGE_TO_BACKEND["1M"]);
  const { data: quotes } = useMarketplacePrices(id);
  const { data: valuation } = useValuation(id);
  const [tier, setTier] = useState<PriceTier>({ house: "raw" });

  if (isLoading) return <ProductDetailSkeleton />;
  if (isError || !card) {
    return (
      <NoteCard
        title="Card not found"
        message="We couldn't resolve this card from the backend."
        action={<Button variant="secondary" size="sm"><Link to="/cards">Back to browse</Link></Button>}
      />
    );
  }

  const changePct = series?.changePct ?? market?.changePct1y;
  const price = card.price ?? market?.raw;

  const details: Array<[string, string]> = [
    ["Card Number / Rarity", [card.number, card.rarity].filter(Boolean).join(" / ") || "—"],
    ["Set", card.setName || "—"],
    ["Year", card.year ? String(card.year) : "—"],
  ];

  // Real per-marketplace quotes when available; otherwise honest search exits.
  const marketRows =
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
          price: undefined,
          href: m.href,
          kind: "market_price" as const,
        }));
  const buyHref = marketRows[0]?.href ?? "#";

  return (
    <div className={styles.product}>
      <nav className={styles.product__crumbs}>
        <Link to="/cards">All Cards</Link>
        <span>›</span>
        <span>{card.setName}</span>
        <span>›</span>
        <span className={styles["product__crumbs-current"]}>{card.name}</span>
      </nav>

      <div className={styles.product__hero}>
        <Panel padding="lg" className={styles.product__art}>
          <CardThumb src={card.imageUrl} alt={card.name} size="lg" />
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
            <p className={styles["product__buybox-sub"]}>Graded avg {formatMoney(market.gradedAvg)}</p>
          )}
          <a href={buyHref} target="_blank" rel="noreferrer" className={styles["product__buybox-cta"]}>
            <Button block size="lg" trailingIcon={<ExternalLink size={16} />}>
              View listings
            </Button>
          </a>
          <div className={styles["product__buybox-watch"]}>
            <WatchlistButton card={card} />
            <AddToCollectionButton card={card} />
          </div>
          <p className={styles["product__buybox-note"]}>Live prices from connected marketplaces.</p>
        </Panel>
      </div>

      {valuation && (valuation.fairValue || valuation.grades.length > 0) && (
        <section className={styles.valuation}>
          <div className={styles.valuation__head}>
            <div>
              <h2 className={styles.product__h2}>Loupe Value</h2>
              <p className={styles.valuation__sub}>
                Our equilibrium estimate — where actual sold comps, live listings, and catalog prices
                meet. One honest number instead of a wall of figures.
              </p>
            </div>
            {valuation.fairValue && (
              <div className={styles.valuation__fair}>
                <span className={styles.valuation__amount}>{formatMoney(valuation.fairValue)}</span>
                <span className={styles.valuation__conf} data-level={valuation.confidence}>
                  <ShieldCheck size={13} /> {CONFIDENCE_LABEL[valuation.confidence] ?? "Estimate"}
                </span>
              </div>
            )}
          </div>

          <div className={styles.valuation__signals}>
            <ValuationSignal label="Sold comps" money={valuation.signals.soldComps} hint="Actual recent sales" />
            <ValuationSignal label="Lowest listings" money={valuation.signals.listings} hint="Live asking prices" />
            <ValuationSignal label="Catalog market" money={valuation.signals.catalog} hint="Aggregated market" />
          </div>

          {valuation.grades.length > 0 && (
            <div className={styles.grades}>
              <h3 className={styles.grades__title}>Price by grade</h3>
              <div className={styles.grades__row}>
                {valuation.grades.map((g) => (
                  <div key={g.grade} className={styles.grade}>
                    <span className={styles.grade__label}>{gradeLabel(g)}</span>
                    <span className={styles.grade__price}>{g.lastSale ? formatMoney(g.lastSale) : "—"}</span>
                    <span className={styles.grade__meta}>
                      {g.deltaPct != null && <Delta percent={g.deltaPct} variant="arrow" />}
                      {g.salesCount > 0 && <span className={styles.grade__count}>{g.salesCount} sold</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className={styles.product__section}>
        <div className={styles.product__chart}>
          <div className={styles.product__chartHead}>
            <h2 className={styles.product__h2}>Price history</h2>
            <GradeSelector value={tier} onChange={setTier} />
          </div>
          <Panel padding="lg">
            <CardPriceChart
              cardId={card.id}
              cardName={`${card.name} · ${tierLabel(tier)}`}
              height={300}
              house={tier.house}
              grade={tier.grade}
            />
            <p className={styles["product__chart-note"]}>
              Showing <strong>{tierLabel(tier)}</strong> prices — switch between Raw and the major grading
              companies above. Tap a timeframe (1W–ALL) and drag to scrub; the line is green when the
              period is up, red when down.
            </p>
          </Panel>
        </div>

        <div className={styles.product__points}>
          <h2 className={styles.product__h2}>Price Points</h2>
          <Panel padding="lg" className={styles["product__points-card"]}>
            {price && <Stat label="Market price" value={formatMoney(price)} />}
            {market?.gradedAvg && <Stat label="Graded average" value={formatMoney(market.gradedAvg)} />}
            {market?.popTotal !== undefined && <Stat label="Population" value={market.popTotal.toLocaleString()} />}
            {market?.changePct1y !== undefined && <Stat label="1-year change" value={<Delta percent={market.changePct1y} />} />}
          </Panel>
        </div>
      </section>

      <section>
        <div className={styles["product__markets-head"]}>
          <h2 className={styles.product__h2}>Marketplaces</h2>
          <span className={styles["product__markets-sub"]}>Live lowest prices across connected marketplaces</span>
        </div>
        <div className={styles.product__markets}>
          {marketRows.map((m) => (
            <a
              key={m.label}
              href={m.href}
              target="_blank"
              rel="noreferrer"
              className={styles["product__market-row"]}
            >
              <div className={styles["product__market-id"]}>
                <span className={styles["product__market-name"]}>{m.label}</span>
                {m.subtitle && <span className={styles["product__market-sub"]}>{m.subtitle}</span>}
              </div>
              <div className={styles["product__market-right"]}>
                {m.price && <span className={styles["product__market-price"]}>{formatMoney(m.price)}</span>}
                <span className={styles["product__market-cta"]}>
                  {m.kind === "listing" ? "Buy" : "View"} <ExternalLink size={13} />
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Loupe Grade — grading happens on-device via the app + Scanner. */}
      <section className={styles.gradeCta}>
        <div className={styles.gradeCta__body}>
          <span className={styles.gradeCta__eyebrow}>
            <ScanLine size={14} /> Loupe Grade
          </span>
          <h2 className={styles.gradeCta__title}>What would this card grade?</h2>
          <p className={styles.gradeCta__sub}>
            Loupe measures centering, edges, corners, and surface and predicts the PSA / BGS / CGC grade —
            scan {card.name} with the Loupe app or the Loupe Scanner to get an instant estimate and see
            what it's worth slabbed.
          </p>
          <div className={styles.gradeCta__actions}>
            <ScanButton label="Scan a card" size="lg" />
            <Link to="/scanner">
              <Button variant="secondary" size="lg">
                Get the Scanner
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className={styles.product}>
      <Skeleton width={260} height={16} />
      <div className={styles.product__hero} style={{ marginTop: 16 }}>
        <Skeleton height={392} radius={14} />
        <div>
          <Skeleton width={280} height={32} />
          <div style={{ height: 16 }} />
          <Skeleton width={200} height={16} />
        </div>
        <Skeleton height={220} radius={14} />
      </div>
    </div>
  );
}
