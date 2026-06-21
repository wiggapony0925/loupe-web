/** Portfolio statements — auto-generated monthly/yearly PDF reports. */

export type ReportPeriod = "monthly" | "yearly";
export type ReportStatus = "pending" | "ready" | "failed";

/** A generated statement (GET /v1/reports). */
export interface UserReport {
  id: string;
  period: ReportPeriod;
  /** ISO date (inclusive) of the period start. */
  periodStart: string;
  /** ISO date (inclusive) of the period end. */
  periodEnd: string;
  status: ReportStatus;
  title: string;
  fileSizeBytes: number | null;
  errorMessage: string | null;
  generatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The next statement that will auto-close (GET /v1/reports/upcoming). */
export interface UpcomingReport {
  period: ReportPeriod;
  periodStart: string;
  periodEnd: string;
  /** UTC datetime when the statement becomes available. */
  closesAt: string;
  /** Human label for the in-progress period, e.g. "May 2026". */
  label: string;
}

/** Download metadata (GET /v1/reports/{id}/download). */
export interface ReportDownload {
  /** Short-lived presigned URL, or null → stream from /file instead. */
  downloadUrl: string | null;
  expiresInSeconds: number;
}

/** Body for POST /v1/reports — generate (or reuse) a statement. */
export interface GenerateReportInput {
  period: ReportPeriod;
  year: number;
  /** Required for monthly reports (1–12). */
  month?: number;
}
