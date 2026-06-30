import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  CheckCircle2,
  CircleSlash,
  ExternalLink,
  Plug,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { useAdminIntegrations, type Integration, type IntegrationStatus } from "@loupe/core";
import { Badge, Button, NoteCard, SegmentedControl, Skeleton } from "@/components";
import { cx } from "@/lib/cx";
import styles from "./AdminIntegrations.module.scss";
import admin from "../admin.module.scss";

type Filter = "all" | "configured" | "unconfigured";
type BadgeTone = "mint" | "blue" | "amber" | "rose" | "neutral";

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "configured", label: "Connected" },
  { value: "unconfigured", label: "Not set up" },
];

const STATUS_META: Record<IntegrationStatus, { tone: BadgeTone; label: string }> = {
  live: { tone: "mint", label: "Live" },
  down: { tone: "rose", label: "Down" },
  ready: { tone: "blue", label: "Connected" },
  unconfigured: { tone: "neutral", label: "Not set up" },
};

/**
 * Developer Portal · Integrations.
 *
 * Every *second-party* service the app depends on — TCG catalogs, pricing/market
 * sources, payments, email, AI, monitoring, infra — grouped by category, with
 * what we use each for, whether it's connected, the capabilities it serves, and
 * a docs link. "Test connections" live-probes each configured service so you can
 * confirm at a glance that everything external is reachable.
 */
export function AdminIntegrations() {
  const [probe, setProbe] = useState(false);
  const { data, isLoading, isError, isFetching, refetch } = useAdminIntegrations(probe);

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const all = useMemo(() => data?.integrations ?? [], [data]);

  const counts = useMemo(
    () => ({
      total: all.length,
      configured: all.filter((i) => i.configured).length,
      live: all.filter((i) => i.status === "live").length,
      down: all.filter((i) => i.status === "down").length,
    }),
    [all],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = all.filter((i) => {
      if (filter === "configured" && !i.configured) return false;
      if (filter === "unconfigured" && i.configured) return false;
      if (q) {
        const hay = `${i.id} ${i.name} ${i.purpose} ${i.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const map = new Map<string, Integration[]>();
    for (const i of filtered) {
      const list = map.get(i.category);
      if (list) list.push(i);
      else map.set(i.category, [i]);
    }
    return [...map.entries()];
  }, [all, filter, query]);

  const runTest = () => {
    setProbe(true);
    // If probe was already on, force a fresh round of pings.
    if (probe) void refetch();
  };

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Integrations</h1>
          <p className={admin.subtitle}>
            Every external service the app relies on — catalogs, pricing, payments, email, AI, and
            infrastructure. See what each is for, whether it&rsquo;s connected, and test that
            it&rsquo;s reachable.
          </p>
        </div>
        <div className={admin.toolbar}>
          <Button
            variant="secondary"
            leadingIcon={
              <RefreshCw size={15} className={isFetching && probe ? styles.spin : undefined} />
            }
            onClick={runTest}
            disabled={isFetching}
          >
            {isFetching && probe ? "Testing…" : "Test connections"}
          </Button>
        </div>
      </div>

      {/* Summary. */}
      <div className={styles.summary}>
        <Stat icon={<Plug size={15} />} label="Services" value={counts.total} tone="blue" />
        <Stat
          icon={<CheckCircle2 size={15} />}
          label="Connected"
          value={counts.configured}
          tone="mint"
        />
        <Stat
          icon={<Activity size={15} />}
          label="Live"
          value={probe ? counts.live : "—"}
          tone="mint"
          hint={probe ? undefined : "run a test"}
        />
        <Stat
          icon={<XCircle size={15} />}
          label="Unreachable"
          value={probe ? counts.down : "—"}
          tone={counts.down > 0 ? "rose" : "neutral"}
        />
      </div>

      {/* Filters. */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.search}
            type="search"
            placeholder="Search services…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search integrations"
          />
        </div>
        <SegmentedControl
          options={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
          aria-label="Filter by status"
        />
      </div>

      {isError ? (
        <NoteCard
          title="Integrations unavailable"
          message="Couldn't load /v1/admin/integrations. If the backend hasn't been deployed with this endpoint yet, it will appear once it's live."
        />
      ) : isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={120} radius={16} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className={styles.empty}>No services match this filter.</p>
      ) : (
        groups.map(([category, items]) => (
          <section key={category} className={styles.group}>
            <header className={styles.group__head}>
              <h2 className={styles.group__title}>{category}</h2>
              <span className={styles.group__count}>{items.length}</span>
            </header>
            <div className={styles.grid}>
              {items.map((i) => (
                <IntegrationCard key={i.id} integration={i} probed={data?.probed ?? false} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  tone: BadgeTone;
  hint?: string;
}) {
  return (
    <div className={cx(styles.stat, styles[`stat--${tone}`])}>
      <span className={styles.stat__icon}>{icon}</span>
      <span className={styles.stat__value}>{value}</span>
      <span className={styles.stat__label}>
        {label}
        {hint && <em className={styles.stat__hint}> · {hint}</em>}
      </span>
    </div>
  );
}

function IntegrationCard({
  integration: i,
  probed,
}: {
  integration: Integration;
  probed: boolean;
}) {
  const meta = STATUS_META[i.status];
  // Before any probe, a "ready" service is just "connected"; don't imply live.
  const showStatus = probed || i.status === "unconfigured" ? meta.label : "Connected";
  const dotClass =
    i.status === "live"
      ? styles["dot--live"]
      : i.status === "down"
        ? styles["dot--down"]
        : i.configured
          ? styles["dot--ready"]
          : styles["dot--off"];

  return (
    <div className={cx(styles.card, !i.configured && styles["card--off"])}>
      <div className={styles.card__top}>
        <span className={cx(styles.dot, dotClass)} />
        <span className={styles.card__name}>{i.name}</span>
        {i.docsUrl && (
          <a
            className={styles.card__docs}
            href={i.docsUrl}
            target="_blank"
            rel="noreferrer noopener"
            title="Open API docs / console"
          >
            <ExternalLink size={13} />
          </a>
        )}
      </div>

      <p className={styles.card__purpose}>{i.purpose}</p>

      <div className={styles.card__foot}>
        <Badge tone={meta.tone} dot={i.status === "live"}>
          {showStatus}
        </Badge>
        {i.latencyMs != null && i.status === "live" && (
          <span className={styles.card__latency}>{i.latencyMs}ms</span>
        )}
        {!i.configured && (
          <span className={styles.card__needs}>
            <CircleSlash size={11} /> needs setup
          </span>
        )}
        {i.capabilities.length > 0 && (
          <span className={styles.card__caps}>{i.capabilities.join(" · ")}</span>
        )}
      </div>
    </div>
  );
}
