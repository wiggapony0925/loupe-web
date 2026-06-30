import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Globe,
  KeyRound,
  Lock,
  Search,
  Server,
} from "lucide-react";
import { useAdminEnv, type EnvVar } from "@loupe/core";
import { Badge, Button, NoteCard, SegmentedControl, Skeleton } from "@/components";
import { cx } from "@/lib/cx";
import { readClientEnv } from "./envRegistry";
import styles from "./AdminEnv.module.scss";
import admin from "../admin.module.scss";

type Scope = "all" | "client" | "server";
type StatusF = "all" | "set" | "unset";
type Row = EnvVar & { scope: "client" | "server" };

const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: "all", label: "All" },
  { value: "client", label: "Client" },
  { value: "server", label: "Server" },
];
const STATUS_OPTIONS: { value: StatusF; label: string }[] = [
  { value: "all", label: "All" },
  { value: "set", label: "Set" },
  { value: "unset", label: "Unset" },
];

function maskOf(value: string): string {
  return "•".repeat(Math.min(Math.max(value.length, 6), 28));
}

/**
 * Developer Portal · Environment manager.
 *
 * One place to see every environment variable the app runs on — client
 * (build-time `import.meta.env`, live + revealable) and server (`/v1/admin/env`).
 * Each row says what the variable is for and links to the provider's API/console.
 * Security: the server never echoes a secret's value — it reports presence +
 * length only, so an admin can confirm a key is set without it crossing the wire.
 */
export function AdminEnv() {
  const clientVars = useMemo(() => readClientEnv(), []);
  const { data, isLoading, isError } = useAdminEnv();

  const [scope, setScope] = useState<Scope>("all");
  const [status, setStatus] = useState<StatusF>("all");
  const [query, setQuery] = useState("");
  const [revealAll, setRevealAll] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  const rows: Row[] = useMemo(
    () => [
      ...clientVars.map((v) => ({ ...v, scope: "client" as const })),
      ...(data?.variables ?? []).map((v) => ({ ...v, scope: "server" as const })),
    ],
    [clientVars, data],
  );

  const counts = useMemo(
    () => ({
      total: rows.length,
      set: rows.filter((r) => r.isSet).length,
      secrets: rows.filter((r) => r.secret).length,
      unset: rows.filter((r) => !r.isSet).length,
    }),
    [rows],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (scope !== "all" && r.scope !== scope) return false;
      if (status === "set" && !r.isSet) return false;
      if (status === "unset" && r.isSet) return false;
      if (q) {
        const hay = `${r.key} ${r.label} ${r.description} ${r.group}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // Preserve first-seen group order.
    const map = new Map<string, Row[]>();
    for (const r of filtered) {
      const list = map.get(r.group);
      if (list) list.push(r);
      else map.set(r.group, [r]);
    }
    return [...map.entries()];
  }, [rows, scope, status, query]);

  const toggleReveal = (key: string) =>
    setRevealed((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const copy = (key: string, value: string) => {
    void navigator.clipboard?.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200);
  };

  const appEnv = data?.appEnv ?? String(import.meta.env.MODE ?? "—");
  const hasMatches = groups.length > 0;

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Environment</h1>
          <p className={admin.subtitle}>
            Every variable the app runs on — client build env and server config — with what each is
            for and a link to its API. Secrets are never exposed: the server reports presence only.
          </p>
        </div>
        <div className={admin.toolbar}>
          <Badge tone={appEnv === "production" ? "rose" : "blue"} dot>
            {appEnv}
          </Badge>
          <Button
            variant="secondary"
            leadingIcon={revealAll ? <EyeOff size={15} /> : <Eye size={15} />}
            onClick={() => setRevealAll((v) => !v)}
          >
            {revealAll ? "Hide values" : "Reveal values"}
          </Button>
        </div>
      </div>

      {/* Summary strip. */}
      <div className={styles.summary}>
        <Stat label="Variables" value={counts.total} />
        <Stat label="Configured" value={counts.set} tone="mint" />
        <Stat label="Secrets" value={counts.secrets} tone="amber" />
        <Stat label="Unset" value={counts.unset} tone="neutral" />
      </div>

      {/* Filters. */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.search}
            type="search"
            placeholder="Search by name, label, or purpose…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search environment variables"
          />
        </div>
        <SegmentedControl
          options={SCOPE_OPTIONS}
          value={scope}
          onChange={setScope}
          aria-label="Scope"
        />
        <SegmentedControl
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
          aria-label="Status"
        />
      </div>

      {/* Server fetch state — client section always renders regardless. */}
      {isError && scope !== "client" && (
        <NoteCard
          title="Server environment unavailable"
          message="Couldn't load /v1/admin/env. If the backend hasn't been deployed with this endpoint yet, the client variables below are still live."
        />
      )}

      {isLoading && scope !== "client" ? (
        <div className={styles.skeletons}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={64} radius={12} />
          ))}
        </div>
      ) : !hasMatches ? (
        <p className={styles.empty}>No variables match this filter.</p>
      ) : (
        groups.map(([group, items]) => (
          <section key={group} className={styles.group}>
            <header className={styles.group__head}>
              <h2 className={styles.group__title}>{group}</h2>
              <span className={styles.group__count}>{items.length}</span>
            </header>
            <div className={styles.rows}>
              {items.map((r) => (
                <EnvRow
                  key={`${r.scope}:${r.key}`}
                  row={r}
                  revealed={revealAll || revealed.has(`${r.scope}:${r.key}`)}
                  copied={copied === `${r.scope}:${r.key}`}
                  onToggle={() => toggleReveal(`${r.scope}:${r.key}`)}
                  onCopy={() => r.value && copy(`${r.scope}:${r.key}`, r.value)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: number;
  tone?: "blue" | "mint" | "amber" | "neutral";
}) {
  return (
    <div className={cx(styles.stat, styles[`stat--${tone}`])}>
      <span className={styles.stat__value}>{value}</span>
      <span className={styles.stat__label}>{label}</span>
    </div>
  );
}

function EnvRow({
  row,
  revealed,
  copied,
  onToggle,
  onCopy,
}: {
  row: Row;
  revealed: boolean;
  copied: boolean;
  onToggle: () => void;
  onCopy: () => void;
}) {
  const hasValue = row.value !== null;
  const ScopeIcon = row.scope === "client" ? Globe : Server;

  return (
    <div className={styles.row}>
      <div className={styles.row__main}>
        <div className={styles.row__top}>
          <code className={styles.row__key}>{row.key}</code>
          <span className={styles.row__scope} title={`${row.scope} variable`}>
            <ScopeIcon size={12} />
            {row.scope}
          </span>
          {row.secret && (
            <span className={styles.row__secret} title="Secret — value withheld by the server">
              <KeyRound size={11} /> secret
            </span>
          )}
          {row.docsUrl && (
            <a
              className={styles.row__docs}
              href={row.docsUrl}
              target="_blank"
              rel="noreferrer noopener"
              title="Open the provider's API docs / console"
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>
        <span className={styles.row__desc}>{row.description}</span>
      </div>

      <div className={styles.row__value}>
        {!row.isSet ? (
          <Badge tone="neutral">Not set</Badge>
        ) : hasValue ? (
          <div className={styles.value}>
            <code className={cx(styles.value__text, !revealed && styles["value__text--masked"])}>
              {revealed ? row.value : maskOf(row.value as string)}
            </code>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={onToggle}
              aria-label={revealed ? "Hide value" : "Reveal value"}
              title={revealed ? "Hide" : "Reveal"}
            >
              {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={onCopy}
              aria-label="Copy value"
              title="Copy"
            >
              {copied ? <Check size={14} className={styles.ok} /> : <Copy size={14} />}
            </button>
          </div>
        ) : (
          // Server secret that's set — presence + length only, never the value.
          <span className={styles.sealed} title="Set on the server — value never exposed">
            <Lock size={12} />
            <Badge tone="mint" dot>
              Set
            </Badge>
            <span className={styles.sealed__len}>· {row.length} chars</span>
          </span>
        )}
      </div>
    </div>
  );
}
