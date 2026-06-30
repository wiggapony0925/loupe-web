import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import {
  getApiLog,
  subscribeApiTelemetry,
  clearApiLog,
  summarizeApiStats,
  summarizeApiTelemetry,
  withApiSource,
  type ApiCallRecord,
  type ApiRouteStats,
  type ApiTelemetrySummary,
} from "@loupe/core";

export interface ApiTelemetry {
  /** Raw log, oldest → newest. Stable reference between recordings. */
  records: readonly ApiCallRecord[];
  /** Per-route rollup, busiest first. */
  stats: ApiRouteStats[];
  /** Top-level totals for the summary strip. */
  summary: ApiTelemetrySummary;
  /** Empty the buffer. */
  clear: () => void;
}

/**
 * Live view of the shared API telemetry recorder ({@link "@loupe/core"}).
 *
 * Subscribes through `useSyncExternalStore` so it stays correct under React 18
 * concurrency, and re-derives the aggregates only when the underlying log
 * actually changes (the snapshot reference is stable between recordings). This
 * is the read side that powers the `/admin/api` inspector — but it works in any
 * component that wants to surface live API activity.
 */
export function useApiTelemetry(): ApiTelemetry {
  const records = useSyncExternalStore(subscribeApiTelemetry, getApiLog, getApiLog);

  // Memoize the derived rollups on the log reference: aggregation is O(n) and
  // the buffer only changes when a request completes.
  const stats = useMemo(() => summarizeApiStats(records), [records]);
  const summary = useMemo(() => summarizeApiTelemetry(records), [records]);

  const clear = useCallback(() => clearApiLog(), []);

  return { records, stats, summary, clear };
}

/**
 * Attribute every API call started synchronously inside `track(...)` to `name`,
 * so it shows up under that component/feature in the inspector's "Source"
 * column. Wrap the call site — typically a React Query fetcher:
 *
 * @example
 *   const { track } = useApiSource("CardDetail");
 *   useQuery({
 *     queryKey: ["market", id],
 *     queryFn: () => track(() => api.cards.market(id)),
 *   });
 *
 * Attribution is best-effort: it captures the source synchronously at the start
 * of the request, so `run` should kick off the fetch directly (don't `await`
 * something else first inside it).
 */
export function useApiSource(name: string) {
  // Keep the latest name in a ref so `track` stays referentially stable even if
  // the label is derived from props that change.
  const nameRef = useRef(name);
  nameRef.current = name;

  const track = useCallback(
    <T>(run: () => Promise<T>): Promise<T> => withApiSource(nameRef.current, run),
    [],
  );

  return { track };
}
