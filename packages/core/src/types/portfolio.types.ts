/** Portfolio + analytics view-models (collection value, movers). */

/** One point on the portfolio value-over-time chart. */
export interface PortfolioPoint {
  /** ISO date (day granularity). */
  date: string;
  priceUsd: number;
}

/** The signed-in user's collection value over time (GET /v1/grades/history). */
export interface PortfolioHistory {
  range: string;
  points: PortfolioPoint[];
  deltaUsd: number;
  deltaPct: number;
}

export interface AnalyticsStats {
  holdings: number;
  uniqueSets: number;
  avgGrade: number;
  gemRatePct: number;
  avgValueUsd: number;
  oldestYear: number | null;
  totalValueUsd: number;
}

export interface AnalyticsKpis {
  totalScans: number;
  avgGrade: number;
  gemRatePct: number;
  lastScanAt: string | null;
  graderSplit: { psa: number; bgs: number; cgc: number };
}

export interface AnalyticsSetIndex {
  setName: string;
  setLogoUrl: string | null;
  count: number;
  totalValueUsd: number;
  sharePct: number;
  changePct1y: number | null;
}

export interface AnalyticsMoverRow {
  gradeId: string;
  cardId: string | null;
  cardName: string | null;
  cardImageUrl: string | null;
  setName: string | null;
  valueUsd: number;
  changePct1y: number;
  /** Absolute 1Y move (USD) from the same history baseline as the % —
   *  render this, never back-derive dollars from the %. Optional until
   *  every deployed backend ships it. */
  changeUsd1y?: number | null;
}

export interface AnalyticsConcentration {
  top1Pct: number;
  top3Pct: number;
  top5Pct: number;
  top1: { cardName: string | null; valueUsd: number };
}

export interface AnalyticsYearBucket {
  decade: number;
  count: number;
  valueUsd: number;
}

export interface AnalyticsGradeBucket {
  bucket: string;
  count: number;
}

export interface AnalyticsOverview {
  stats: AnalyticsStats;
  kpis: AnalyticsKpis;
  setIndexes: AnalyticsSetIndex[];
  movers: { gainers: AnalyticsMoverRow[]; losers: AnalyticsMoverRow[] };
  concentration: AnalyticsConcentration | null;
  yearDistribution: AnalyticsYearBucket[];
  gradeDistribution: AnalyticsGradeBucket[];
}

export interface TopMoverRow {
  gradeId: string;
  cardId: string | null;
  cardName: string | null;
  cardImageUrl: string | null;
  cardSetName?: string | null;
  priceUsd: number | null;
  changePct1y: number | null;
}

export interface RecentScanRow {
  gradeId: string;
  cardId: string | null;
  cardName: string | null;
  cardImageUrl: string | null;
  cardSetName: string | null;
  grade: number | null;
  house: string | null;
  scannedAt: string | null;
  estimatedValueUsd: number | null;
}

export interface HomeFeed {
  topMovers: TopMoverRow[];
  recentScans: RecentScanRow[];
}
