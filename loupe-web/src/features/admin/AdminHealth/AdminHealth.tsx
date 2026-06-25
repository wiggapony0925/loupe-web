import { useMemo } from "react";
import { RefreshCw, ShieldCheck, AlertTriangle, XCircle, MinusCircle } from "lucide-react";
import {
  useAdminHealth,
  type HealthCheck,
  type HealthStatus,
  type HealthOverall,
} from "@loupe/core";
import { Button, Skeleton, NoteCard } from "@/components";
import styles from "./AdminHealth.module.scss";
import admin from "../admin.module.scss";

const CATEGORY_LABEL: Record<string, string> = {
  core: "Core",
  data: "Data providers",
  infra: "Infrastructure",
  config: "Configuration",
};

const STATUS_ICON: Record<HealthStatus, typeof ShieldCheck> = {
  ok: ShieldCheck,
  warn: AlertTriangle,
  down: XCircle,
  unconfigured: MinusCircle,
};

const OVERALL_COPY: Record<HealthOverall, { title: string; sub: string }> = {
  ok: { title: "All systems healthy", sub: "Every core check is passing." },
  warn: { title: "Attention needed", sub: "One or more checks need a look." },
  down: { title: "Outage", sub: "A core system is failing — investigate now." },
};

/** Admin: live system health — schema drift, Redis, providers, prod config. */
export function AdminHealth() {
  const { data, isLoading, isError, isFetching, refetch } = useAdminHealth();

  // Group checks by category so the grid reads as labelled sections.
  const groups = useMemo(() => {
    const by = new Map<string, HealthCheck[]>();
    for (const c of data?.checks ?? []) {
      const list = by.get(c.category) ?? [];
      if (list.length === 0) by.set(c.category, list);
      list.push(c);
    }
    return [...by.entries()];
  }, [data]);

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>System health</h1>
          <p className={admin.subtitle}>
            Live status of the database, migrations, queue, providers, and production config.
          </p>
        </div>
        <Button
          variant="secondary"
          leadingIcon={<RefreshCw size={16} className={isFetching ? styles.spin : undefined} />}
          onClick={() => refetch()}
          disabled={isFetching}
        >
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={92} radius={16} />
          ))}
        </div>
      ) : isError || !data ? (
        <NoteCard title="Couldn't load health" message="Please refresh in a moment." />
      ) : (
        <>
          <div className={styles.banner} data-status={data.status}>
            <span className={styles.banner__dot} />
            <div>
              <span className={styles.banner__title}>{OVERALL_COPY[data.status].title}</span>
              <span className={styles.banner__sub}>{OVERALL_COPY[data.status].sub}</span>
            </div>
            <time className={styles.banner__time}>
              {new Date(data.generatedAt).toLocaleTimeString()}
            </time>
          </div>

          {groups.map(([category, checks]) => (
            <section key={category} className={styles.section}>
              <h2 className={styles.section__label}>{CATEGORY_LABEL[category] ?? category}</h2>
              <div className={styles.grid}>
                {checks.map((c) => {
                  const Icon = STATUS_ICON[c.status];
                  return (
                    <div key={c.key} className={styles.check} data-status={c.status}>
                      <span className={styles.check__icon}>
                        <Icon size={18} />
                      </span>
                      <div className={styles.check__body}>
                        <span className={styles.check__label}>{c.label}</span>
                        <span className={styles.check__detail}>{c.detail}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
