import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Layers, ScanLine, Wallet } from "lucide-react";
import {
  useAnalyticsOverview,
  useHomeFeed,
  usePortfolioHistory,
  type CardSummary,
  type RecentScanRow,
} from "@loupe/core";
import { useActiveCollection } from "@/providers/ActiveCollectionProvider";
import { Panel, MetricCard, SegmentedControl, LiveSparkRow } from "@/components";
import type { RangeKey } from "@/components/MarketChart/MarketChart";
import { formatMoney, formatSignedMoney } from "@/lib/format";
import styles from "./Overview.module.scss";

/** A recent scan → the CardSummary the canonical sparkline row consumes. */
const toCardSummary = (r: RecentScanRow): CardSummary => ({
  id: r.cardId ?? "",
  name: r.cardName ?? "Card",
  setName: r.cardSetName ?? "",
  imageUrl: r.cardImageUrl ?? "",
  price: r.estimatedValueUsd != null ? { amount: r.estimatedValueUsd, currency: "USD" } : undefined,
});

const RANGES: { value: RangeKey; label: string }[] = [
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "1Y", label: "1Y" },
  { value: "ALL", label: "ALL" },
];

const SINCE: Partial<Record<RangeKey, string>> = {
  "1W": "vs last week",
  "1M": "vs last month",
  "3M": "vs last 3 months",
  "1Y": "vs last year",
  ALL: "all time",
};

/**
 * Dashboard "Overview" — the bento hero. Two oversized metric cards
 * (collection value with its range-aware delta, and holdings) over a row of
 * the latest additions, with a period control in the header. Mirrors the
 * reference's overview card, driven entirely by live data + theme tokens.
 */
export function Overview() {
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeKey>("1M");
  const { collectionId } = useActiveCollection();
  const history = usePortfolioHistory(range, collectionId);
  const analytics = useAnalyticsOverview(collectionId);
  const feed = useHomeFeed({ recentScans: 10 });

  const stats = analytics.data?.stats;
  const points = history.data?.points ?? [];
  const latest = points.at(-1)?.priceUsd;
  const value = latest ?? stats?.totalValueUsd ?? 0;
  const hasHistory = points.length > 1;
  const recent = feed.data?.recentScans ?? [];

  return (
    <Panel padding="lg" raised className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>Overview</h2>
        <SegmentedControl
          aria-label="Overview period"
          options={RANGES}
          value={range}
          onChange={setRange}
        />
      </div>

      <div className={styles.metrics}>
        <MetricCard
          accent
          tone="mint"
          icon={<Wallet size={16} />}
          label="Collection value"
          value={formatMoney({ amount: value, currency: "USD" })}
          changePct={hasHistory ? history.data?.deltaPct : undefined}
          caption={
            hasHistory && history.data
              ? `${formatSignedMoney(history.data.deltaUsd)} · ${SINCE[range] ?? ""}`
              : SINCE[range]
          }
        />
        <MetricCard
          tone="blue"
          icon={<Layers size={16} />}
          label="Holdings"
          value={(stats?.holdings ?? 0).toLocaleString()}
          caption={
            stats
              ? `across ${stats.uniqueSets.toLocaleString()} ${
                  stats.uniqueSets === 1 ? "set" : "sets"
                } · avg ${formatMoney({ amount: stats.avgValueUsd, currency: "USD" })}`
              : "Scan a card to begin"
          }
          onClick={() => navigate("/app/vault")}
        />
      </div>

      {recent.length > 0 ? (
        <div className={styles.latest}>
          <div className={styles.latestHead}>
            <div className={styles.latestText}>
              <span className={styles.latestTitle}>Latest scans</span>
              <span className={styles.latestSub}>
                Your {recent.length} most recent — live price + trend.
              </span>
            </div>
            <button type="button" className={styles.scanCta} onClick={() => navigate("/scan")}>
              <ScanLine size={15} /> Scan
            </button>
          </div>
          <div className={styles.stack}>
            {recent.slice(0, 5).map((r) => (
              <LiveSparkRow
                key={r.gradeId}
                card={toCardSummary(r)}
                onClick={() => r.cardId && navigate(`/cards/${encodeURIComponent(r.cardId)}`)}
              />
            ))}
          </div>
          <button type="button" className={styles.viewAll} onClick={() => navigate("/app/vault")}>
            View all in vault <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <button type="button" className={styles.emptyScan} onClick={() => navigate("/scan")}>
          <ScanLine size={18} /> Scan a card to begin
        </button>
      )}
    </Panel>
  );
}
