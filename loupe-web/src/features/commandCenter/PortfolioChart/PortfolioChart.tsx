import { useState } from "react";
import { usePortfolioHistory } from "@loupe/core";
import { Panel } from "@/components";
import {
  MarketChart,
  type RangeKey,
} from "@/components/MarketChart/MarketChart";
import { formatMoney } from "@/lib/format";
import styles from "./PortfolioChart.module.scss";

const RANGES: RangeKey[] = ["1W", "1M", "3M", "1Y", "ALL"];

/**
 * The dashboard's hero: the user's collection value over time — the web twin
 * of the mobile Command Center's portfolio chart. Reuses the same interactive
 * `MarketChart` as every other price surface (scrub, range pills, green/red by
 * period), fed by the real `/v1/grades/history` series.
 */
export function PortfolioChart() {
  const [range, setRange] = useState<RangeKey>("1Y");
  const { data, isLoading } = usePortfolioHistory(range);
  const points = data?.points ?? [];
  const hasData = points.length > 1;

  return (
    <Panel padding="lg" raised className={styles.portfolio}>
      {hasData ? (
        <MarketChart
          title="Collection value"
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
      ) : (
        <div className={styles.empty} style={{ height: 300 }}>
          {isLoading
            ? "Loading your collection value…"
            : "Add graded cards to your vault to track your collection value over time."}
        </div>
      )}
    </Panel>
  );
}
