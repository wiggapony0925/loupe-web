/** Admin "Ask your data" view models. Mirrors app/schemas/insights.py. */

export interface InsightsAnswer {
  configured: boolean;
  question: string;
  sql: string | null;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  error: string | null;
}
