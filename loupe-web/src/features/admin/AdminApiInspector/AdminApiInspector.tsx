import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Gauge,
  HardDrive,
  Layers,
  Pause,
  Play,
  Radio,
  Search,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  setApiTelemetryEnabled,
  summarizeApiStats,
  summarizeApiTelemetry,
  type ApiCallRecord,
} from "@loupe/core";
import { Badge, Button, MetricCard, SegmentedControl, Sparkline } from "@/components";
import { useApiTelemetry } from "@/hooks/useApiTelemetry";
import { cx } from "@/lib/cx";
import styles from "./AdminApiInspector.module.scss";
import admin from "../admin.module.scss";

type StatusFilter = "all" | "ok" | "errors";
type BadgeTone = "mint" | "blue" | "amber" | "rose" | "neutral";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ok", label: "Success" },
  { value: "errors", label: "Errors" },
];

/** Map an HTTP status to one of the accent tones. `0` = transport failure. */
function statusTone(status: number): BadgeTone {
  if (status === 0) return "rose";
  if (status < 300) return "mint";
  if (status < 400) return "blue";
  if (status < 500) return "amber";
  return "rose";
}

function methodTone(method: string): BadgeTone {
  switch (method) {
    case "GET":
      return "blue";
    case "POST":
      return "mint";
    case "PUT":
    case "PATCH":
      return "amber";
    case "DELETE":
      return "rose";
    default:
      return "neutral";
  }
}

function fmtMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

function fmtBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtPct(rate: number): string {
  return `${(rate * 100).toFixed(rate > 0 && rate < 0.01 ? 2 : 1)}%`;
}

/** Compact "12s ago" / "3m ago" from an epoch-ms timestamp. */
function ago(startedAt: number, now: number): string {
  const s = Math.max(0, Math.round((now - startedAt) / 1000));
  if (s < 1) return "now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function clock(startedAt: number): string {
  return new Date(startedAt).toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const SNIPPET = `const { track } = useApiSource("CardDetail");

useQuery({
  queryKey: ["market", id],
  queryFn: () => track(() => api.cards.market(id)),
});`;

/**
 * Developer Portal · API inspector.
 *
 * A live, in-browser view of every backend call this tab has made — captured at
 * the shared `@loupe/core` client, so it covers 100% of `/v1` traffic with zero
 * per-call wiring. Shows which endpoints you hit, how often, how fast, what they
 * return, and the full chronological stream. Read-only and payload-free: only
 * response *shapes* and sizes are kept, never bodies.
 */
export function AdminApiInspector() {
  const { records, clear } = useApiTelemetry();

  const [live, setLive] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [routeFilter, setRouteFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // A 1s tick so the "x ago" labels stay fresh without re-recording.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Pausing stops the recorder app-wide; always re-enable when we leave so we
  // never silently drop traffic for the rest of the session.
  useEffect(() => {
    setApiTelemetryEnabled(live);
    return () => setApiTelemetryEnabled(true);
  }, [live]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (routeFilter && r.route !== routeFilter) return false;
      if (status === "ok" && !r.ok) return false;
      if (status === "errors" && r.ok) return false;
      if (q) {
        const hay = `${r.method} ${r.path} ${r.source ?? ""} ${r.dataShape ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, query, status, routeFilter]);

  const summary = useMemo(() => summarizeApiTelemetry(filtered), [filtered]);
  const routes = useMemo(() => summarizeApiStats(filtered), [filtered]);

  // Newest first for the stream; cap the DOM at a sane number of rows.
  const stream = useMemo(() => filtered.slice(-250).reverse(), [filtered]);
  const selected = useMemo(
    () => (selectedId == null ? null : (records.find((r) => r.id === selectedId) ?? null)),
    [records, selectedId],
  );

  const hasData = records.length > 0;

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>API inspector</h1>
          <p className={admin.subtitle}>
            Every backend call this tab has made — endpoints, frequency, latency, payload shape, and
            a live stream. Captured at the shared client, so it&rsquo;s complete.
          </p>
        </div>
        <div className={admin.toolbar}>
          <Button
            variant={live ? "secondary" : "primary"}
            leadingIcon={live ? <Pause size={15} /> : <Play size={15} />}
            onClick={() => setLive((v) => !v)}
          >
            {live ? "Pause" : "Resume"}
          </Button>
          <Button
            variant="ghost"
            leadingIcon={<Trash2 size={15} />}
            onClick={() => {
              clear();
              setSelectedId(null);
            }}
            disabled={!hasData}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Summary strip — reflects the active filter. */}
      <div className={styles.metrics}>
        <MetricCard
          label="Total calls"
          value={summary.totalCalls.toLocaleString()}
          icon={<Activity size={15} />}
          tone="blue"
          caption={`${summary.callsLastMinute} in the last min`}
        />
        <MetricCard
          label="Endpoints"
          value={summary.uniqueRoutes.toLocaleString()}
          icon={<Layers size={15} />}
          tone="purple"
          caption="distinct routes"
        />
        <MetricCard
          label="Error rate"
          value={fmtPct(summary.errorRate)}
          icon={<AlertTriangle size={15} />}
          tone={summary.errorCount > 0 ? "rose" : "mint"}
          caption={`${summary.errorCount} failed`}
        />
        <MetricCard
          label="Avg latency"
          value={fmtMs(summary.avgMs)}
          icon={<Zap size={15} />}
          tone="amber"
          caption={`p95 ${fmtMs(summary.p95Ms)}`}
        />
        <MetricCard
          label="Data moved"
          value={fmtBytes(summary.totalBytes)}
          icon={<HardDrive size={15} />}
          tone="mint"
          caption="response bytes"
        />
      </div>

      {/* Filters. */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.search}
            type="search"
            placeholder="Filter by route, method, source, or shape…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter API calls"
          />
        </div>
        <SegmentedControl
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
          aria-label="Filter by status"
        />
        {routeFilter && (
          <button
            type="button"
            className={styles.activeFilter}
            onClick={() => setRouteFilter(null)}
          >
            <code>{routeFilter}</code>
            <X size={13} />
          </button>
        )}
      </div>

      {!hasData ? (
        <EmptyState />
      ) : (
        <div className={styles.grid}>
          {/* Endpoint catalog. */}
          <section className={styles.panel}>
            <header className={styles.panel__head}>
              <h2 className={styles.panel__title}>Endpoints</h2>
              <span className={styles.panel__hint}>busiest first · click to focus</span>
            </header>
            <div className={styles.routes}>
              {routes.length === 0 ? (
                <p className={styles.muted}>No calls match this filter.</p>
              ) : (
                routes.map((r) => (
                  <button
                    key={r.route}
                    type="button"
                    className={cx(styles.route, routeFilter === r.route && styles["route--active"])}
                    onClick={() => setRouteFilter((cur) => (cur === r.route ? null : r.route))}
                  >
                    <div className={styles.route__head}>
                      <span className={styles.route__methods}>
                        {r.methods.map((m) => (
                          <Badge key={m} tone={methodTone(m)}>
                            {m}
                          </Badge>
                        ))}
                      </span>
                      <code className={styles.route__path}>{r.route}</code>
                      <Badge tone={statusTone(r.lastStatus)} dot>
                        {r.lastStatus || "ERR"}
                      </Badge>
                    </div>
                    <div className={styles.route__stats}>
                      <span title="Calls">
                        <strong>{r.count}</strong> {r.count === 1 ? "call" : "calls"}
                      </span>
                      <span
                        className={r.errors > 0 ? styles.bad : undefined}
                        title="Errors / error rate"
                      >
                        {r.errors} err · {fmtPct(r.errorRate)}
                      </span>
                      <span title="Average · p95 latency">
                        {fmtMs(r.avgMs)} · p95 {fmtMs(r.p95Ms)}
                      </span>
                      {r.latencySpark.length >= 2 && (
                        <span className={styles.route__spark}>
                          <Sparkline data={r.latencySpark} width={72} height={22} fill={false} />
                        </span>
                      )}
                    </div>
                    {r.sources.length > 0 && (
                      <div className={styles.route__sources}>
                        {r.sources.map((s) => (
                          <span key={s} className={styles.sourceTag}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Live stream + per-call detail. */}
          <section className={styles.panel}>
            <header className={styles.panel__head}>
              <h2 className={styles.panel__title}>
                <Radio size={14} className={cx(styles.liveDot, !live && styles.liveDotPaused)} />
                Live activity
              </h2>
              <span className={styles.panel__hint}>
                {stream.length} shown{!live && " · paused"}
              </span>
            </header>

            {selected && <CallDetail record={selected} onClose={() => setSelectedId(null)} />}

            <div className={styles.stream}>
              {stream.length === 0 ? (
                <p className={styles.muted}>No calls match this filter.</p>
              ) : (
                stream.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={cx(styles.entry, selectedId === r.id && styles["entry--active"])}
                    onClick={() => setSelectedId((cur) => (cur === r.id ? null : r.id))}
                  >
                    <Badge tone={statusTone(r.status)} dot>
                      {r.status || "ERR"}
                    </Badge>
                    <span className={styles.entry__method} data-method={r.method}>
                      {r.method}
                    </span>
                    <code className={styles.entry__path}>{r.path}</code>
                    <span className={styles.entry__ms}>{fmtMs(r.durationMs)}</span>
                    <time className={styles.entry__time}>{ago(r.startedAt, now)}</time>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

/** Expanded view of a single call — the "how data flows" detail. */
function CallDetail({ record, onClose }: { record: ApiCallRecord; onClose: () => void }) {
  const rows: { label: string; value: ReactNode }[] = [
    {
      label: "Status",
      value: (
        <Badge tone={statusTone(record.status)} dot>
          {record.status || "network error"}
        </Badge>
      ),
    },
    { label: "Method", value: <code>{record.method}</code> },
    { label: "Round-trip", value: fmtMs(record.durationMs) },
    {
      label: "Server time",
      value: record.serverMs != null ? fmtMs(record.serverMs) : "—",
    },
    { label: "Response size", value: fmtBytes(record.bytes) },
    { label: "Data shape", value: <code>{record.dataShape ?? "—"}</code> },
    { label: "Source", value: record.source ? <code>{record.source}</code> : "untagged" },
    {
      label: "Request id",
      value: record.requestId ? <code>{record.requestId}</code> : "—",
    },
    { label: "When", value: clock(record.startedAt) },
  ];

  return (
    <div className={styles.detail}>
      <div className={styles.detail__top}>
        <code className={styles.detail__path}>{record.path}</code>
        <button type="button" className={styles.detail__close} onClick={onClose} aria-label="Close">
          <X size={15} />
        </button>
      </div>
      <dl className={styles.detail__grid}>
        {rows.map((row) => (
          <div key={row.label} className={styles.detail__row}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {record.error && (
        <p className={styles.detail__error}>
          <strong>{record.error.code}</strong> — {record.error.message}
        </p>
      )}
    </div>
  );
}

/** Shown until the tab has made its first call — and teaches the source hook. */
function EmptyState() {
  return (
    <div className={styles.empty}>
      <Gauge size={28} className={styles.empty__icon} />
      <h2 className={styles.empty__title}>No API calls yet</h2>
      <p className={styles.empty__body}>
        Move around the app in this tab — every <code>/v1</code> request is captured automatically
        at the shared client and will show up here.
      </p>
      <div className={styles.empty__snippetWrap}>
        <span className={styles.empty__snippetLabel}>
          Tag calls to a component with <code>useApiSource</code>:
        </span>
        <pre className={styles.empty__snippet}>{SNIPPET}</pre>
      </div>
    </div>
  );
}
