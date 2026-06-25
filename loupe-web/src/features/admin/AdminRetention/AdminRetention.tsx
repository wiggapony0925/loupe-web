import { useAdminRetention } from "@loupe/core";
import { Skeleton, NoteCard } from "@/components";
import styles from "./AdminRetention.module.scss";
import admin from "../admin.module.scss";

const cohortLabel = (w: string) =>
  new Date(`${w}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Admin: cohort-retention triangle. Each row is a signup-week cohort; each
 *  column is weeks since signup; cells show the share active (scanned or added
 *  a card) that week, shaded by intensity. Read-only. */
export function AdminRetention() {
  const { data, isLoading, isError } = useAdminRetention();
  const cols = data ? Array.from({ length: data.weeks }, (_, i) => i) : [];

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Retention</h1>
          <p className={admin.subtitle}>
            By signup week — the share of each cohort still active (scanned or added a card) each week.
          </p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton height={320} radius={16} />
      ) : isError || !data ? (
        <NoteCard title="Couldn't load retention" message="Please refresh in a moment." />
      ) : (
        <div className={styles.wrap}>
          <table className={styles.grid}>
            <thead>
              <tr>
                <th className={styles.cohortHead}>Cohort</th>
                <th className={styles.sizeHead}>Users</th>
                {cols.map((n) => (
                  <th key={n} className={styles.weekHead}>Wk {n}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((c) => (
                <tr key={c.cohort}>
                  <td className={styles.cohort}>{cohortLabel(c.cohort)}</td>
                  <td className={styles.size}>{c.size}</td>
                  {cols.map((n) => {
                    const v = c.retention[n];
                    if (v === undefined) return <td key={n} className={styles.empty} />;
                    const pct = Math.round(v * 100);
                    return (
                      <td
                        key={n}
                        className={styles.cell}
                        style={{
                          background: `color-mix(in srgb, var(--accent-mint) ${pct}%, transparent)`,
                          color: pct >= 55 ? "var(--bg-base)" : "var(--ink-muted)",
                        }}
                      >
                        {pct}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className={styles.note}>Week 0 is the signup week. Empty cells haven&rsquo;t elapsed yet.</p>
    </div>
  );
}
