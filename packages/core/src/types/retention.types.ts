/** Admin cohort-retention view models. Mirrors app/schemas/retention.py.
 *  Field names already match the wire shape, so no adapter is needed. */

export interface CohortRow {
  cohort: string;
  size: number;
  /** retention[N] = fraction of the cohort active in week N (0 = signup week). */
  retention: number[];
}

export interface RetentionReport {
  weeks: number;
  cohorts: CohortRow[];
}
