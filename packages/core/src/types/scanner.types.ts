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
