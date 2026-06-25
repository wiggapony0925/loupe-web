import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAdminGrades } from "@loupe/core";
import { Skeleton, NoteCard, Pagination, GradeBadge, Badge } from "@/components";
import styles from "./AdminGrades.module.scss";
import admin from "../admin.module.scss";

const PAGE_SIZE = 25;

const usd = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const dt = (iso: string) => new Date(iso).toLocaleDateString();
const sub = (v: unknown) => (typeof v === "number" ? v.toFixed(1) : String(v));

/** Admin: grade-review queue — QA of graded cards, defaulting to Loupe's
 *  first-party grades. Shows the grade, subgrades, condition, and value. */
export function AdminGrades() {
  const [house, setHouse] = useState("loupe");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useAdminGrades({ house, page });

  const setHouseFilter = (h: string) => {
    setHouse(h);
    setPage(1);
  };
  const pageCount = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Grade review</h1>
          <p className={admin.subtitle}>
            QA the grades on collectors&rsquo; cards — first-party Loupe grades by default.
          </p>
        </div>
        <select
          className={styles.house}
          value={house}
          onChange={(e) => setHouseFilter(e.target.value)}
        >
          <option value="loupe">Loupe (first-party)</option>
          <option value="all">All houses</option>
          {(data?.houses ?? [])
            .filter((h) => h !== "loupe")
            .map((h) => (
              <option key={h} value={h}>
                {h.toUpperCase()}
              </option>
            ))}
        </select>
      </div>

      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={84} radius={14} />
          ))}
        </div>
      ) : isError || !data ? (
        <NoteCard title="Couldn't load grades" message="Please refresh in a moment." />
      ) : data.results.length === 0 ? (
        <NoteCard title="Nothing to review" message="No grades match this filter." />
      ) : (
        <>
          <div className={styles.count}>{data.total.toLocaleString()} graded cards</div>
          <div className={styles.list}>
            {data.results.map((g) => (
              <div key={g.id} className={styles.row}>
                {g.cardImageUrl ? (
                  <img className={styles.thumb} src={g.cardImageUrl} alt="" loading="lazy" />
                ) : (
                  <span className={styles.thumb} data-empty />
                )}
                <div className={styles.row__main}>
                  <span className={styles.row__name}>{g.cardName ?? "Unknown card"}</span>
                  <span className={styles.row__meta}>
                    {[g.setName, g.userEmail].filter(Boolean).join(" · ")}
                  </span>
                  {g.subgrades && (
                    <div className={styles.sub}>
                      {Object.entries(g.subgrades).map(([k, v]) => (
                        <span key={k} className={styles.sub__chip}>
                          {k.slice(0, 3)} <strong>{sub(v)}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className={styles.row__right}>
                  <GradeBadge grade={g.grade} company={g.house.toUpperCase()} />
                  {g.condition && <Badge tone="neutral">{g.condition.toUpperCase()}</Badge>}
                  {g.estimatedValueUsd != null && (
                    <span className={styles.value}>{usd(g.estimatedValueUsd)}</span>
                  )}
                  <time className={styles.date}>{dt(g.gradedAt)}</time>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
        </>
      )}

      <p className={styles.footnote}>
        <ShieldCheck size={12} /> Read-only QA view.
      </p>
    </div>
  );
}
