import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  api,
  CARD_CHART_RANGES,
  CARD_CHART_RANGE_TO_BACKEND,
  type CardChartRange,
  type PriceSeries,
} from "@loupe/core";
import { formatMoney } from "@/lib/format";
import { MarketChart, type ChartSeries, type RangeKey } from "./MarketChart";
import styles from "./CardPriceChart.module.scss";

const DAY = 86_400_000;

/** A single line to plot — the primary tier or a compare overlay. */
export interface ChartTier {
  house: string;
  grade?: string;
  label: string;
  color: string;
}

interface CardPriceChartProps {
  cardId: string;
  cardName?: string;
  height?: number;
  header?: boolean;
  title?: string;
  /** Starting range. Defaults to 1M (a month) like the app. */
  defaultRange?: CardChartRange;
  /** Grading house ("raw" | "psa" | "bgs" | "cgc" | "sgc" | "tag") to chart. */
  house?: string;
  /** Grade within the house (e.g. "10", "9.5") — omit for raw. */
  grade?: string;
  /** Additional tiers overlaid as distinctly-coloured compare lines. */
  compare?: ChartTier[];
}

/**
 * Range-aware price chart for a card — the canonical wrapper around
 * `MarketChart` used everywhere a card's history is shown (hero, detail).
 *
 * It owns the active range and fetches the matching backend bucket
 * (`1W→7d … ALL→all`) for the primary tier plus any compare overlays via
 * `useQueries`, so each timeframe renders a correctly-grained, accurately
 * timestamped series. `ALL` walks back to the card's release year, mirroring
 * the mobile app's `InteractiveCardChart`.
 */
export function CardPriceChart({
  cardId,
  cardName,
  height = 300,
  header = true,
  title,
  defaultRange = "1M",
  house,
  grade,
  compare = [],
}: CardPriceChartProps) {
  const [range, setRange] = useState<CardChartRange>(defaultRange);
  const backendRange = CARD_CHART_RANGE_TO_BACKEND[range];

  // Primary line first (drives the header value/delta), then compares.
  const tiers: ChartTier[] = [
    {
      house: house ?? "raw",
      grade,
      label: cardName ?? "Price",
      color: "var(--accent-mint)",
    },
    ...compare,
  ];

  const results = useQueries({
    queries: tiers.map((t) => ({
      queryKey: ["prices", cardId, backendRange, t.house, t.grade ?? "all"],
      queryFn: () => api.cards.prices(cardId, backendRange, t.house, t.grade),
      enabled: Boolean(cardId),
      staleTime: 300_000,
    })),
  });

  const primary = results[0];
  const currency =
    (primary?.data as PriceSeries | undefined)?.currency ?? "USD";
  const fmtMoney = (v: number) => formatMoney({ amount: v, currency });

  const series: ChartSeries[] = tiers
    .map((t, i): ChartSeries | null => {
      const data = results[i]?.data as PriceSeries | undefined;
      if (!data || data.points.length < 2) return null;
      return {
        id: `${t.house}-${t.grade ?? "raw"}`,
        label: t.label,
        color: t.color,
        points: data.points.map((v, j) => ({ t: data.at[j] ?? j * DAY, v })),
      };
    })
    .filter((s): s is ChartSeries => s !== null);

  const hasData = series.length > 0 && (series[0]?.points.length ?? 0) > 1;

  return (
    <div className={styles.wrap}>
      {hasData ? (
        <MarketChart
          series={series}
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
          loading={primary?.isLoading ?? false}
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
