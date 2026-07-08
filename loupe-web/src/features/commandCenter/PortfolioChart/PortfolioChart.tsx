import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine, TrendingUp } from "lucide-react";
import { usePortfolioHistory } from "@loupe/core";
import { useActiveCollection } from "@/providers/ActiveCollectionProvider";
import { Panel, Button } from "@/components";
import { MarketChart, type RangeKey } from "@/components/MarketChart/MarketChart";
import { formatMoney } from "@/lib/format";
import styles from "./PortfolioChart.module.scss";

const RANGES: RangeKey[] = ["1W", "1M", "3M", "1Y", "ALL"];

/**
 * The dashboard hero: the user's collection value over time — the web twin of
 * the mobile Command Center's portfolio chart. Always present so the dashboard
 * leads with "what's mine"; reuses the interactive `MarketChart` (scrub, range
 * pills, green/red) fed by real `/v1/grades/history`, with a first-run
 * onboarding state when the vault is still empty.
 */
export function PortfolioChart() {
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeKey>("1Y");
  const { collectionId } = useActiveCollection();
  const { data, isLoading } = usePortfolioHistory(range, collectionId);
  const points = data?.points ?? [];
  const hasData = points.length > 1;

  if (hasData) {
    return (
      <Panel padding="lg" raised className={styles.portfolio}>
        <MarketChart
          title="Performance"
          series={[
            {
              id: "portfolio",
              label: "Collection",
              points: points.map((p) => ({
                t: new Date(p.date).getTime(),
                v: p.priceUsd,
              })),
            },
          ]}
          height={300}
          range={range}
          ranges={RANGES}
          onRangeChange={(r) => setRange(r)}
          format={(v) => formatMoney({ amount: v, currency: "USD" })}
        />
      </Panel>
    );
  }

  return (
    <Panel padding="lg" raised className={styles.portfolio}>
      <div className={styles.empty}>
        {/* Ghost chart behind the copy — signals "your value line lands here". */}
        <svg className={styles.ghost} viewBox="0 0 600 200" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="pf-ghost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-mint)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--accent-mint)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 150 C60 122 120 168 180 132 C240 96 300 142 360 92 C420 56 480 104 540 64 L600 44 L600 200 L0 200 Z"
            fill="url(#pf-ghost)"
          />
          <path
            d="M0 150 C60 122 120 168 180 132 C240 96 300 142 360 92 C420 56 480 104 540 64 L600 44"
            fill="none"
            stroke="var(--accent-mint)"
            strokeWidth="2"
            strokeOpacity="0.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className={styles.emptyContent}>
          {isLoading ? (
            <span className={styles.emptyLoading}>Loading your collection…</span>
          ) : (
            <>
              <span className={styles.emptyIcon} aria-hidden>
                <TrendingUp size={24} />
              </span>
              <span className={styles.emptyEyebrow}>Your collection</span>
              <h3 className={styles.emptyTitle}>Track your cards like a portfolio</h3>
              <p className={styles.emptyText}>
                Scan or add graded cards to your vault and watch your collection&rsquo;s value move
                over time — charted right here, like a stock ticker.
              </p>
              <div className={styles.emptyActions}>
                <Button leadingIcon={<ScanLine size={16} />} onClick={() => navigate("/scan")}>
                  Scan a card
                </Button>
                <Button variant="secondary" onClick={() => navigate("/cards")}>
                  Browse cards
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}
