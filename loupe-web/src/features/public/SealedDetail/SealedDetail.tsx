import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, Expand, ExternalLink, Plus } from "lucide-react";
import {
  useAddSealedHolding,
  useSealedHoldings,
  useSealedMarket,
  useSealedProduct,
} from "@loupe/core";
import {
  Panel,
  Button,
  Badge,
  Stat,
  Delta,
  MarketChart,
  MediaPlaceholder,
  NoteCard,
  Skeleton,
} from "@/components";
import { Card3DModal } from "../ProductDetail/Card3DModal/Card3DModal";
import { useAuth } from "@/auth/AuthProvider";
import { useSetHref } from "@/hooks/useSetHref";
import { formatMoney } from "@/lib/format";
import { SEALED_TYPE_LABEL } from "../Sealed/SealedCard/SealedCard";
import styles from "./SealedDetail.module.scss";

const usd = (n: number | null | undefined) =>
  n == null ? "—" : formatMoney({ amount: n, currency: "USD" });

/** Where the live quote came from — surfaced as a credibility chip. */
const SOURCE_LABEL: Record<string, string> = {
  tcgplayer: "TCGplayer",
  pricecharting: "PriceCharting",
};

/**
 * Sealed-product detail — the card-detail page's sibling. Reuses the same
 * primitives (Panel, BarChart, Delta, Badge, Button) to show the financial
 * data sealed SKUs actually have: a live TCGplayer market snapshot
 * (low/mid/high/market) versus MSRP, plus add-to-collection. No price history
 * is stored for sealed, so the chart is a price-tier spread, not a time series.
 */
export function SealedDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: product, isLoading, isError } = useSealedProduct(id);
  const { data: market } = useSealedMarket(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const add = useAddSealedHolding();
  const { data: holdings } = useSealedHoldings({}, Boolean(user));
  const [justAdded, setJustAdded] = useState(false);
  const [viewer, setViewer] = useState(false);
  const setHref = useSetHref(product?.tcg, product?.setName);

  if (isLoading) return <SealedDetailSkeleton />;
  if (isError || !product) {
    return (
      <NoteCard
        title="Product not found"
        message="We couldn't find that sealed product."
        action={
          <Button variant="secondary" size="sm">
            <Link to="/sealed">Back to sealed</Link>
          </Button>
        }
      />
    );
  }

  const owned =
    (holdings ?? []).some((h) => h.productId === product.id) || justAdded;
  const typeLabel = SEALED_TYPE_LABEL[product.productType] ?? "Sealed";
  const msrp = product.msrp?.amount ?? null;
  const marketPrice = market?.market ?? null;
  // Premium/discount of live market vs MSRP.
  const premiumPct =
    marketPrice != null && msrp != null && msrp > 0
      ? ((marketPrice - msrp) / msrp) * 100
      : undefined;
  const headlinePrice = marketPrice ?? msrp;
  const sourceLabel = market?.source ? (SOURCE_LABEL[market.source] ?? null) : null;

  // Price-guide spread: market's position within the low→high range, so the
  // single headline number reads in context (App-Store / brokerage style).
  const low = market?.low ?? null;
  const high = market?.high ?? null;
  const hasSpread =
    low != null && high != null && high > low && marketPrice != null;
  const spreadPct = hasSpread
    ? Math.min(100, Math.max(0, ((marketPrice! - low!) / (high! - low!)) * 100))
    : 0;

  // Real value line: MSRP-at-release → current market. Reuses the card price
  // chart (MarketChart); more points fill in as daily snapshots accumulate.
  const series = (market?.points ?? []).map((p) => ({
    t: new Date(p.ts).getTime(),
    v: p.price,
  }));

  function handleAdd() {
    if (!user) {
      navigate("/login");
      return;
    }
    if (owned || add.isPending) return;
    add.mutate(
      { productId: product!.id, estimatedValueUsd: headlinePrice },
      { onSuccess: () => setJustAdded(true) },
    );
  }

  return (
    <div className={styles.page}>
      <nav className={styles.crumbs}>
        <Link to="/sealed">Sealed</Link>
        <span>›</span>
        {product.setName &&
          (setHref ? (
            <Link to={setHref}>{product.setName}</Link>
          ) : (
            <span>{product.setName}</span>
          ))}
        {product.setName && <span>›</span>}
        <span className={styles.crumbsCurrent}>{typeLabel}</span>
      </nav>

      <div className={styles.hero}>
        <Panel padding="lg" className={styles.art}>
          {product.imageUrl ? (
            <>
              <div className={styles.photo}>
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className={styles.photoImg}
                />
              </div>
              <button
                type="button"
                className={styles.expand}
                onClick={() => setViewer(true)}
                aria-label="Expand product image"
              >
                <Expand size={16} />
              </button>
            </>
          ) : (
            <MediaPlaceholder kind="sealed" label={product.setName ?? undefined} />
          )}
        </Panel>

        <div className={styles.info}>
          <span className={styles.eyebrow}>
            <Badge tone="mint">{typeLabel}</Badge>
            {product.setName &&
              (setHref ? (
                <Link to={setHref} className={styles.setLink}>
                  {product.setName}
                </Link>
              ) : (
                product.setName
              ))}
          </span>
          <h1 className={styles.name}>{product.name}</h1>

          <div className={styles.priceLine}>
            <span className={styles.price}>{usd(headlinePrice)}</span>
            {premiumPct !== undefined && (
              <Delta percent={premiumPct} variant="pill" size="md" />
            )}
            <span className={styles.priceCaption}>
              {marketPrice != null ? "live market" : "MSRP"}
              {sourceLabel && marketPrice != null && <> · {sourceLabel}</>}
              {marketPrice != null && msrp != null && <> · MSRP {usd(msrp)}</>}
            </span>
          </div>

          {hasSpread && (
            <div className={styles.spread}>
              <div className={styles.spreadTrack}>
                <span
                  className={styles.spreadMarker}
                  style={{ left: `${spreadPct}%` }}
                />
              </div>
              <div className={styles.spreadLabels}>
                <span>Low {usd(low)}</span>
                <span>High {usd(high)}</span>
              </div>
            </div>
          )}

          <div className={styles.buy}>
            <Button
              size="lg"
              leadingIcon={owned ? <Check size={16} /> : <Plus size={16} />}
              disabled={add.isPending || owned}
              onClick={handleAdd}
            >
              {owned
                ? "In your vault"
                : add.isPending
                  ? "Adding…"
                  : "Add to collection"}
            </Button>
            {market?.marketplaceUrl && (
              <a
                className={styles.marketBtn}
                href={market.marketplaceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Buy on TCGplayer <ExternalLink size={15} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Value over time — reuses the card price line chart (MarketChart). */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionEyebrow}>Performance</span>
          <h2 className={styles.sectionTitle}>Value since release</h2>
        </div>
        {series.length > 1 ? (
          <Panel padding="lg" raised className={styles.chartPanel}>
            <MarketChart
              title="Market value"
              series={[{ id: "sealed", label: product.name, points: series }]}
              height={260}
              format={(v) => usd(v)}
            />
          </Panel>
        ) : (
          <NoteCard
            title="No live market yet"
            message="We couldn't fetch a live quote for this product right now. MSRP is shown above."
          />
        )}
      </section>

      {/* Snapshot stats */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionEyebrow}>Snapshot</span>
          <h2 className={styles.sectionTitle}>Details</h2>
        </div>
        <div className={styles.stats}>
          <Stat label="Market" value={usd(marketPrice)} />
          <Stat label="Low" value={usd(market?.low)} />
          <Stat label="High" value={usd(market?.high)} />
          <Stat label="MSRP" value={usd(msrp)} />
          <Stat
            label="vs MSRP"
            value={
              premiumPct === undefined
                ? "—"
                : `${premiumPct >= 0 ? "+" : ""}${premiumPct.toFixed(1)}%`
            }
          />
          <Stat label="Type" value={typeLabel} />
          <Stat
            label="Released"
            value={
              product.releaseDate
                ? new Date(product.releaseDate).toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                  })
                : "—"
            }
          />
        </div>
      </section>

      {product.imageUrl && (
        <Card3DModal
          open={viewer}
          onOpenChange={setViewer}
          mode="product"
          src={product.imageUrl}
          alt={product.name}
          title={product.name}
          subtitle={[product.setName, typeLabel].filter(Boolean).join(" · ")}
        />
      )}
    </div>
  );
}

function SealedDetailSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <Skeleton height={360} radius={16} />
        <div className={styles.info}>
          <Skeleton width={120} height={20} />
          <Skeleton width="80%" height={32} />
          <Skeleton width={160} height={28} />
          <Skeleton width={220} height={48} radius={12} />
        </div>
      </div>
      <Skeleton height={240} radius={16} />
    </div>
  );
}
