import { useState } from "react";
import {
  usePriceHistory,
  CARD_CHART_RANGES,
  CARD_CHART_RANGE_TO_BACKEND,
  type CardChartRange,
} from "@loupe/core";
import { formatMoney } from "@/lib/format";
import { MarketChart, type RangeKey } from "./MarketChart";
import styles from "./CardPriceChart.module.scss";

interface CardPriceChartProps {
  cardId: string;
  cardName?: string;
  height?: number;
  header?: boolean;
  title?: string;
  /** Starting range. Defaults to 1M (a month) like the app. */
  defaultRange?: CardChartRange;
}

/**
 * Range-aware price chart for a card — the canonical wrapper around
 * `MarketChart` used everywhere a card's history is shown (hero, detail).
 *
 * It owns the active range and fetches the matching backend bucket
 * (`1W→7d … ALL→all`), so each timeframe renders a correctly-grained,
 * accurately-timestamped series. `ALL` walks back to the card's release
 * year, mirroring the mobile app's `InteractiveCardChart`.
 */
export function CardPriceChart({
  cardId,
  cardName,
  height = 300,
  header = true,
  title,
  defaultRange = "1M",
}: CardPriceChartProps) {
  const [range, setRange] = useState<CardChartRange>(defaultRange);
  const { data: series, isLoading } = usePriceHistory(cardId, CARD_CHART_RANGE_TO_BACKEND[range]);

  const fmtMoney = (v: number) =>
    formatMoney({ amount: v, currency: series?.currency ?? "USD" });

  const hasData = series && series.points.length > 1;

  return (
    <div className={styles.wrap}>
      {hasData ? (
        <MarketChart
          series={[
            {
              id: cardId,
              label: cardName,
              points: series.points.map((v, i) => ({ t: series.at[i] ?? i * 86_400_000, v })),
            },
          ]}
          height={height}
          header={header}
          title={title}
          range={range as RangeKey}
          ranges={CARD_CHART_RANGES as unknown as RangeKey[]}
          onRangeChange={(r) => setRange(r as CardChartRange)}
          format={fmtMoney}
        />
      ) : (
        // Keep the pill row interactive while a range loads / has no data, so
        // switching ranges always works even on a sparse series.
        <RangeOnly
          range={range}
          loading={isLoading}
          onRangeChange={setRange}
          height={height}
          header={header}
        />
      )}
    </div>
  );
}

/** Placeholder shown while a range loads or returns no points — keeps the
 *  timeframe pills usable so the user can pick another range. */
function RangeOnly({
  range,
  loading,
  onRangeChange,
  height,
  header,
}: {
  range: CardChartRange;
  loading: boolean;
  onRangeChange: (r: CardChartRange) => void;
  height: number;
  header: boolean;
}) {
  return (
    <div>
      {header && <div className={styles.value}>—</div>}
      <div className={styles.empty} style={{ height }}>
        {loading ? "Loading price history…" : "No history for this range."}
      </div>
      <div className={styles.ranges} role="tablist" aria-label="Time range">
        {CARD_CHART_RANGES.map((r) => (
          <button
            key={r}
            role="tab"
            aria-selected={r === range}
            className={r === range ? styles.rangeActive : styles.range}
            onClick={() => onRangeChange(r)}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
