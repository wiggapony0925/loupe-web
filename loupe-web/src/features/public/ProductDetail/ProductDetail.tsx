import { Link, useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { useCard, useMarket, useMarketplacePrices, usePriceHistory, CARD_CHART_RANGE_TO_BACKEND } from "@loupe/core";
import { CardThumb, Panel, Badge, Button, CardPriceChart, Skeleton, NoteCard, Stat, Delta } from "@/components";
import { WatchlistButton } from "../WatchlistButton/WatchlistButton";
import { AddToCollectionButton } from "@/features/collection";
import { formatMoney } from "@/lib/format";
import styles from "./ProductDetail.module.scss";

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

      <section className={styles.product__section}>
        <div className={styles.product__chart}>
          <h2 className={styles.product__h2}>Price history</h2>
          <Panel padding="lg">
            <CardPriceChart cardId={card.id} cardName={card.name} height={300} />
            <p className={styles["product__chart-note"]}>
              Tap a timeframe — 1W to ALL (back to the card's release year). Drag across the chart to scrub
              historical prices; the line turns green when the period is up, red when it's down.
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
