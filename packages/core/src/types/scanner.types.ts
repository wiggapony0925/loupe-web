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

// ── Scan history log (dev portal) ──────────────────────────────────────

/** One ranked candidate the scanner returned for a scan. */
export interface ScanHistoryCandidate {
  upstreamId?: string | null;
  cardId?: string | null;
  name: string;
  confidence: number;
  source: string; // "text" | "phash" | "feedback"
}

/** A single scan in the admin history grid. */
export interface ScanHistoryItem {
  id: string;
  createdAt: string; // ISO-8601 UTC
  /** Who scanned. Null = anonymous (pre-login camera-first flow). */
  userId?: string | null;
  userEmail?: string | null;
  /** The scanned frame, as a ready-to-render data URL (or null). */
  imageUrl?: string | null;
  topName?: string | null;
  topUpstreamId?: string | null;
  topConfidence: number;
  primarySource: string; // "phash" | "text" | "none" | …
  candidateCount: number;
  tcgInferred: string;
  ocrProvider: string;
  parsedTitle?: string | null;
  parsedNumber?: string | null;
  latencyMs: number;
  costUsd: number;
  /** Whether the user later confirmed / corrected this scan (if any). */
  feedbackCorrect?: boolean | null;
}

/** A cursor page of scan-history rows (newest first). */
export interface ScanHistoryPage {
  items: ScanHistoryItem[];
  /** Opaque cursor for the next (older) page; null when there are no more. */
  nextCursor?: string | null;
  total: number;
}

/** Full drill-down for one scan: every candidate + the raw OCR text. */
export interface ScanHistoryDetail extends ScanHistoryItem {
  ocrFullText?: string | null;
  ocrConfidence: number;
  parsedSetCode?: string | null;
  phash?: string | null;
  imageSha256?: string | null;
  candidates: ScanHistoryCandidate[];
}

/** Query filters for the scan-history feed. */
export interface ScanHistoryQuery {
  limit?: number;
  offset?: number;
  userId?: string;
  source?: string;
  tcg?: string;
  provider?: string;
  minConfidence?: number;
  matched?: boolean;
}
