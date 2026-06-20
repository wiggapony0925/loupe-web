/**
 * Card price-chart timeframe vocabulary — shared by web + mobile so the
 * pills and timestamps mean the same thing everywhere.
 *
 * Each UI range maps to a backend history bucket exposed by
 * `GET /v1/cards/{id}/prices?range=…` (`7d|30d|90d|1y|all`). `ALL` is the
 * card's entire lifetime — the backend walks back to its release year, so a
 * 1999 card shows ~25y of history, not a flat 2-year fallback.
 *
 * Mirrors `loupe-frontend` `InteractiveCardChart.RANGE_TO_HISTORY` and the
 * backend `card_search_service._RANGE_DAYS`.
 */
export type CardChartRange = "1W" | "1M" | "3M" | "1Y" | "ALL";

/** Ordered pills for the per-card chart (matches the mobile app's distinct buckets). */
export const CARD_CHART_RANGES: readonly CardChartRange[] = ["1W", "1M", "3M", "1Y", "ALL"] as const;

/** UI range → backend `range` query value. */
export const CARD_CHART_RANGE_TO_BACKEND: Record<CardChartRange, string> = {
  "1W": "7d",
  "1M": "30d",
  "3M": "90d",
  "1Y": "1y",
  ALL: "all",
};

/** Resting subtitle for a range — e.g. "Past month", "All time". */
export function labelForCardChartRange(range: CardChartRange): string {
  switch (range) {
    case "1W":
      return "Past week";
    case "1M":
      return "Past month";
    case "3M":
      return "Past 3 months";
    case "1Y":
      return "Past year";
    case "ALL":
      return "All time";
  }
}
