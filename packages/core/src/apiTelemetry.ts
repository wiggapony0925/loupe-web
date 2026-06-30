/**
 * API telemetry — a tiny, platform-agnostic recorder for every backend call.
 *
 * `apiFetchEnvelope` (the single chokepoint for all `/v1` traffic) emits one
 * {@link ApiCallRecord} here per request. Nothing else in core depends on this
 * module, and this module depends on no platform global (no `window`,
 * `localStorage`, or `import.meta`) — so the same recorder runs on web and
 * mobile. UIs subscribe via {@link subscribeApiTelemetry} and aggregate with
 * {@link summarizeApiStats}; the web Developer Portal renders it as the
 * "API inspector" dev tool.
 *
 * Design constraints:
 *  - **Bounded.** A fixed-size ring buffer (default 500) caps memory — we never
 *    grow without limit, even on a long-lived tab.
 *  - **Payload-free.** We store request/response *shapes* and *sizes*, never the
 *    bodies — so no PII or tokens ever land in the buffer.
 *  - **Cheap + defensive.** Recording is a single array write plus listener
 *    fan-out, wrapped so a telemetry bug can never break a real request.
 */

/** One observed request/response round-trip. Immutable once recorded. */
export interface ApiCallRecord {
  /** Monotonic id, unique within this session (for stable React keys). */
  readonly id: number;
  /** HTTP method, upper-cased. Defaults to `GET`. */
  readonly method: string;
  /** Request path as called, including any query string. */
  readonly path: string;
  /**
   * Normalized route template for grouping — ids/uuids/numeric segments are
   * collapsed and the query string dropped (e.g. `/v1/cards/abc123/market`
   * → `/v1/cards/:id/market`). This is the key the inspector aggregates on.
   */
  readonly route: string;
  /** HTTP status. `0` means the request never reached the server (network). */
  readonly status: number;
  /** Whether the response was 2xx. */
  readonly ok: boolean;
  /** Client-observed round-trip time in ms (fetch start → body read). */
  readonly durationMs: number;
  /** Server-reported processing time from the envelope `meta`, if present. */
  readonly serverMs: number | null;
  /** Response body size in bytes (UTF-16 length approximation), if known. */
  readonly bytes: number | null;
  /** Envelope `meta.request_id` for cross-referencing backend logs. */
  readonly requestId: string | null;
  /** Wall-clock start time (epoch ms). */
  readonly startedAt: number;
  /**
   * One-line description of the response `data` shape — object keys, array
   * length, or primitive type — so you can see *what* each endpoint returns
   * without storing the payload. `null` when there is no body.
   */
  readonly dataShape: string | null;
  /** Set only on failure: the typed error code + message. */
  readonly error: { code: string; message: string } | null;
  /**
   * The component/feature that initiated the call, when wrapped with
   * `withApiSource` (web `useApiSource`). `null` for untagged traffic.
   */
  readonly source: string | null;
}

/** Per-route rollup produced by {@link summarizeApiStats}. */
export interface ApiRouteStats {
  readonly route: string;
  /** Distinct HTTP methods seen on this route, e.g. `["GET", "POST"]`. */
  readonly methods: string[];
  readonly count: number;
  readonly errors: number;
  /** `errors / count` in `[0, 1]`. */
  readonly errorRate: number;
  readonly avgMs: number;
  readonly p95Ms: number;
  readonly maxMs: number;
  /** Total response bytes observed across all calls to this route. */
  readonly totalBytes: number;
  /** Status of the most recent call. */
  readonly lastStatus: number;
  /** `startedAt` of the most recent call. */
  readonly lastSeen: number;
  /** Source labels that touched this route. */
  readonly sources: string[];
  /** Recent client durations, oldest→newest, for a latency sparkline. */
  readonly latencySpark: number[];
}

/** Top-level totals across the whole buffer. */
export interface ApiTelemetrySummary {
  readonly totalCalls: number;
  readonly uniqueRoutes: number;
  readonly errorCount: number;
  readonly errorRate: number;
  readonly avgMs: number;
  readonly p95Ms: number;
  readonly totalBytes: number;
  /** Calls observed in the last 60s (rolling rate indicator). */
  readonly callsLastMinute: number;
  /** Span covered by the buffer in ms (oldest → newest), or 0 if <2 calls. */
  readonly windowMs: number;
}

// ── Ring buffer + subscriptions ──────────────────────────────────────────────

const DEFAULT_CAPACITY = 500;

let capacity = DEFAULT_CAPACITY;
let buffer: ApiCallRecord[] = [];
let nextId = 1;
let enabled = true;

type Listener = () => void;
const listeners = new Set<Listener>();

/** Snapshot cache so `getApiLog()` returns a stable reference between changes
 *  (required for `useSyncExternalStore` to avoid render loops). */
let snapshot: readonly ApiCallRecord[] = buffer;

function emitChange(): void {
  snapshot = buffer.slice();
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* a broken subscriber must not break recording */
    }
  }
}

/** Enable/disable recording at runtime (e.g. a "pause" toggle in the UI). */
export function setApiTelemetryEnabled(value: boolean): void {
  enabled = value;
}

export function isApiTelemetryEnabled(): boolean {
  return enabled;
}

/** Resize the ring buffer. Trims oldest records if the new size is smaller. */
export function setApiTelemetryCapacity(size: number): void {
  capacity = Math.max(1, Math.floor(size));
  if (buffer.length > capacity) {
    buffer = buffer.slice(buffer.length - capacity);
    emitChange();
  }
}

/** Record one call. Called by the client; safe to call from anywhere. */
export function recordApiCall(record: Omit<ApiCallRecord, "id">): void {
  if (!enabled) return;
  try {
    const full: ApiCallRecord = { ...record, id: nextId++ };
    buffer.push(full);
    if (buffer.length > capacity) buffer.shift();
    emitChange();
  } catch {
    /* never let telemetry throw into a request path */
  }
}

/** Current log, newest last. Stable reference until the next change. */
export function getApiLog(): readonly ApiCallRecord[] {
  return snapshot;
}

/** Clear the buffer (the inspector's "Clear" button). */
export function clearApiLog(): void {
  buffer = [];
  emitChange();
}

/** Subscribe to buffer changes. Returns an unsubscribe function. */
export function subscribeApiTelemetry(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ── Source attribution stack ─────────────────────────────────────────────────
//
// `withApiSource(label, run)` brackets a synchronous call site so the request
// it kicks off is tagged with `label`. The recorder reads the top of this stack
// at the *start* of each fetch (before the first await), so attribution is
// correct under concurrency as long as `run` initiates the request
// synchronously (the common case: a React Query fetcher that calls `api.x()`).

const sourceStack: string[] = [];

export function pushApiSource(label: string): void {
  sourceStack.push(label);
}

export function popApiSource(): void {
  sourceStack.pop();
}

/** The source label in effect right now, or `null`. */
export function peekApiSource(): string | null {
  return sourceStack.length
    ? (sourceStack[sourceStack.length - 1] ?? null)
    : null;
}

/**
 * Tag every API call started synchronously inside `run` with `source`. Use the
 * web `useApiSource(name)` hook for the ergonomic React form.
 *
 * @example
 *   const data = await withApiSource("CardDetail", () => api.cards.market(id));
 */
export function withApiSource<T>(source: string, run: () => T): T {
  pushApiSource(source);
  try {
    return run();
  } finally {
    popApiSource();
  }
}

// ── Pure helpers (route normalization + shape summary) ────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a path segment that looks like an identifier rather than a name. */
function looksLikeId(segment: string): boolean {
  if (!segment) return false;
  if (UUID_RE.test(segment)) return true;
  if (/^\d+$/.test(segment)) return true; // pure numeric id
  // Provider-scoped catalog id, e.g. `pokemontcg:swsh7-215`, `scryfall:<uuid>`.
  // No real route word contains a colon, so this is safe to collapse.
  if (segment.includes(":")) return true;
  // Mixed alphanumerics that aren't a known route word (has a digit + length).
  if (
    segment.length >= 8 &&
    /\d/.test(segment) &&
    /^[a-z0-9_-]+$/i.test(segment)
  )
    return true;
  return false;
}

/**
 * Collapse a concrete path into a route template for grouping. Drops the query
 * string and replaces id-like segments with `:id`. Pure + deterministic.
 */
export function normalizeRoute(path: string): string {
  const pathname = path.split("?")[0] ?? path;
  const segments = pathname.split("/").map((s) => (looksLikeId(s) ? ":id" : s));
  const route = segments.join("/");
  return route || "/";
}

/**
 * One-line description of a parsed response body — what the endpoint hands back,
 * without keeping the body itself.
 *   - array            → `Array(12)`
 *   - object           → `{ data, meta, pagination }` (first few keys)
 *   - primitive/null   → its type/`null`
 */
export function summarizeShape(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `Array(${value.length})`;
  const t = typeof value;
  if (t !== "object") return t; // string | number | boolean | undefined
  const keys = Object.keys(value as Record<string, unknown>);
  if (keys.length === 0) return "{}";
  const shown = keys.slice(0, 5).join(", ");
  return keys.length > 5 ? `{ ${shown}, +${keys.length - 5} }` : `{ ${shown} }`;
}

// ── Aggregation ───────────────────────────────────────────────────────────────

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.ceil((p / 100) * sortedAsc.length) - 1,
  );
  return sortedAsc[Math.max(0, idx)] ?? 0;
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

/** Roll the raw log up into one row per route, busiest first. */
export function summarizeApiStats(
  records: readonly ApiCallRecord[],
): ApiRouteStats[] {
  const byRoute = new Map<string, ApiCallRecord[]>();
  for (const r of records) {
    const list = byRoute.get(r.route);
    if (list) list.push(r);
    else byRoute.set(r.route, [r]);
  }

  const rows: ApiRouteStats[] = [];
  for (const [route, calls] of byRoute) {
    const durations = calls.map((c) => c.durationMs);
    const sorted = [...durations].sort((a, b) => a - b);
    const errors = calls.filter((c) => !c.ok).length;
    const totalMs = durations.reduce((a, b) => a + b, 0);
    const last = calls.reduce((a, b) => (b.startedAt >= a.startedAt ? b : a));
    rows.push({
      route,
      methods: uniqueSorted(calls.map((c) => c.method)),
      count: calls.length,
      errors,
      errorRate: calls.length ? errors / calls.length : 0,
      avgMs: calls.length ? Math.round(totalMs / calls.length) : 0,
      p95Ms: Math.round(percentile(sorted, 95)),
      maxMs: sorted.length ? (sorted[sorted.length - 1] ?? 0) : 0,
      totalBytes: calls.reduce((a, c) => a + (c.bytes ?? 0), 0),
      lastStatus: last.status,
      lastSeen: last.startedAt,
      sources: uniqueSorted(
        calls.map((c) => c.source).filter((s): s is string => Boolean(s)),
      ),
      latencySpark: calls.slice(-24).map((c) => c.durationMs),
    });
  }

  // Busiest routes first; ties broken by most-recent activity.
  rows.sort((a, b) => b.count - a.count || b.lastSeen - a.lastSeen);
  return rows;
}

/** Top-level totals for the summary strip. */
export function summarizeApiTelemetry(
  records: readonly ApiCallRecord[],
): ApiTelemetrySummary {
  if (records.length === 0) {
    return {
      totalCalls: 0,
      uniqueRoutes: 0,
      errorCount: 0,
      errorRate: 0,
      avgMs: 0,
      p95Ms: 0,
      totalBytes: 0,
      callsLastMinute: 0,
      windowMs: 0,
    };
  }
  const durations = records.map((r) => r.durationMs);
  const sorted = [...durations].sort((a, b) => a - b);
  const errorCount = records.filter((r) => !r.ok).length;
  const totalMs = durations.reduce((a, b) => a + b, 0);
  const routes = new Set(records.map((r) => r.route));
  const now = Date.now();
  const callsLastMinute = records.filter(
    (r) => now - r.startedAt <= 60_000,
  ).length;
  const first = records[0]?.startedAt ?? now;
  const lastSeen = records[records.length - 1]?.startedAt ?? now;

  return {
    totalCalls: records.length,
    uniqueRoutes: routes.size,
    errorCount,
    errorRate: errorCount / records.length,
    avgMs: Math.round(totalMs / records.length),
    p95Ms: Math.round(percentile(sorted, 95)),
    totalBytes: records.reduce((a, r) => a + (r.bytes ?? 0), 0),
    callsLastMinute,
    windowMs: Math.max(0, lastSeen - first),
  };
}
