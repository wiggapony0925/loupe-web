import { useState } from "react";
import { Play, Terminal } from "lucide-react";
import { getApiConfig } from "@loupe/core";
import { Button, Badge } from "@/components";
import styles from "./AdminConsole.module.scss";

const SUGGESTED = [
  "/v1/me",
  "/v1/admin/health",
  "/v1/admin/metrics",
  "/v1/admin/revenue",
  "/v1/admin/catalog",
  "/v1/admin/scanner",
  "/v1/admin/engagement",
  "/v1/admin/pulse",
  "/v1/admin/cloud",
  "/v1/admin/database/tables",
];

interface Result {
  status: number;
  ms: number;
  bytes: number;
  body: string;
  ok: boolean;
  networkError?: string;
}

function pretty(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/** Admin: a read-only API console. Fires GET requests against the backend with
 *  your own admin session and pretty-prints the response. GET-only by design —
 *  it can only read what you're already authorized to read. */
export function AdminConsole() {
  const [path, setPath] = useState("/v1/admin/health");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  const send = async (target = path) => {
    const p = target.trim();
    if (!p.startsWith("/")) return;
    setLoading(true);
    setResult(null);
    const cfg = getApiConfig();
    const token = cfg.getToken?.();
    const url = (cfg.baseUrl || "") + p;
    const started = performance.now();
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: cfg.withCredentials ? "include" : "same-origin",
      });
      const body = await res.text();
      setResult({
        status: res.status,
        ms: Math.round(performance.now() - started),
        bytes: new Blob([body]).size,
        body,
        ok: res.ok,
      });
    } catch (e) {
      setResult({
        status: 0,
        ms: Math.round(performance.now() - started),
        bytes: 0,
        body: "",
        ok: false,
        networkError: e instanceof Error ? e.message : "Network error",
      });
    } finally {
      setLoading(false);
    }
  };

  const statusTone = (s: number) =>
    s >= 200 && s < 300 ? "mint" : s >= 400 && s < 500 ? "amber" : "rose";

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>API console</h1>
          <p className={styles.subtitle}>
            Fire a read-only request and inspect the response — runs as you.
          </p>
        </div>
      </div>

      <div className={styles.bar}>
        <span className={styles.method}>GET</span>
        <input
          className={styles.path}
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="/v1/admin/health"
          spellCheck={false}
          autoFocus
        />
        <Button onClick={() => send()} disabled={loading} leadingIcon={<Play size={15} />}>
          {loading ? "Sending…" : "Send"}
        </Button>
      </div>

      <div className={styles.chips}>
        {SUGGESTED.map((s) => (
          <button
            key={s}
            type="button"
            className={styles.chip}
            onClick={() => {
              setPath(s);
              send(s);
            }}
          >
            {s.replace("/v1", "")}
          </button>
        ))}
      </div>

      {result && (
        <div className={styles.result}>
          <div className={styles.result__meta}>
            {result.networkError ? (
              <Badge tone="rose">Failed</Badge>
            ) : (
              <Badge tone={statusTone(result.status)} dot>
                {result.status}
              </Badge>
            )}
            <span>{result.ms} ms</span>
            {!result.networkError && <span>{result.bytes.toLocaleString()} bytes</span>}
          </div>
          <pre className={styles.body}>
            {result.networkError ? result.networkError : pretty(result.body)}
          </pre>
        </div>
      )}

      <p className={styles.footnote}>
        <Terminal size={12} /> GET only · uses your admin session · read-only.
      </p>
    </div>
  );
}
