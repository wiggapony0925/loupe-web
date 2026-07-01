/** Admin scanner-funnel view models. Mirrors app/schemas/scanner_stats.py. */

export interface ScannerStats {
  windowDays: number;
  totalIdentifications: number;

  /** Which signal won the match: "phash" | "text" | "feedback" | "none". */
  bySource: Record<string, number>;
  fastPathRate: number;

  totalFeedback: number;
  correctFeedback: number;
  top1Accuracy: number;
  meanConfidence: number;

  latencyP50Ms: number;
  latencyP95Ms: number;
  totalCostUsd: number;

  byProvider: Record<string, number>;
  byTcg: Record<string, number>;

  scansTotal: number;
  scansByStatus: Record<string, number>;
}

/** One day of identify activity for the speed + accuracy trend charts. */
export interface ScannerTrendPoint {
  date: string; // YYYY-MM-DD (UTC)
  count: number;
  meanConfidence: number; // 0-1
  latencyP50Ms: number;
  latencyP95Ms: number;
  fastPathRate: number; // 0-1
}

export interface ScannerTrend {
  windowDays: number;
  points: ScannerTrendPoint[];
}
