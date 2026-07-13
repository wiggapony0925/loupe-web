/**
 * Population report — how many graded copies exist, by house and grade.
 *
 * Renders the canonical document's `population` block (PSA/CGC/BGS pop
 * data the backend already composes). Mirrors mobile's PopulationSection
 * so both clients surface the same numbers. Renders nothing when the
 * backend had no population source for the card.
 */
import { useCardCerts, useCardPopulation } from "@loupe/core";
import { Panel } from "@/components";
import styles from "./PopulationPanel.module.scss";

/** Rows shown before we cut off (highest population first). */
const MAX_ROWS = 8;

export function PopulationPanel({ cardId }: { cardId: string }) {
  const { data } = useCardPopulation(cardId);
  const { data: certs } = useCardCerts(cardId);
  const hasPop = Boolean(data && data.total > 0 && data.rows.length > 0);
  const hasCerts = (certs?.length ?? 0) > 0;
  if (!hasPop && !hasCerts) return null;
  if (!hasPop) {
    return (
      <Panel padding="lg" className={styles.root}>
        <div className={styles.head}>
          <h2 className={styles.title}>Verified certs</h2>
        </div>
        {certs!.map((c) => (
          <div key={`${c.house}-${c.certNumber}`} className={styles.row}>
            <span className={styles.grade}>
              {c.house.toUpperCase()} #{c.certNumber}
            </span>
            <span className={styles.count}>
              {[c.grade, c.subject, c.year].filter(Boolean).join(" · ") || "verified"}
            </span>
          </div>
        ))}
      </Panel>
    );
  }

  const rows = [...data!.rows]
    .sort((a, b) => b.population - a.population)
    .slice(0, MAX_ROWS);
  const houses = Object.entries(data!.byHouse).filter(([, n]) => n > 0);
  const maxPop = rows[0]?.population ?? 1;

  return (
    <Panel padding="lg" className={styles.root}>
      <div className={styles.head}>
        <h2 className={styles.title}>Population report</h2>
        <span className={styles.total}>{data!.total.toLocaleString()} graded</span>
      </div>
      {houses.length > 1 && (
        <div className={styles.houses}>
          {houses.map(([house, n]) => (
            <span key={house}>
              {house.toUpperCase()} {n.toLocaleString()}
            </span>
          ))}
        </div>
      )}
      {rows.map((r) => (
        <div key={`${r.house}-${r.grade}`} className={styles.row}>
          <span className={styles.grade}>
            {r.house.toUpperCase()} {r.grade}
          </span>
          <span className={styles.bar}>
            <span
              className={styles.fill}
              style={{ width: `${Math.max(4, (r.population / maxPop) * 100)}%` }}
            />
          </span>
          <span className={styles.count}>
            {r.population.toLocaleString()}
            {r.popHigher != null ? ` · ${r.popHigher} ↑` : ""}
          </span>
        </div>
      ))}
      {hasCerts &&
        certs!.map((c) => (
          <div key={`${c.house}-${c.certNumber}`} className={styles.row}>
            <span className={styles.grade}>
              {c.house.toUpperCase()} #{c.certNumber}
            </span>
            <span className={styles.count}>
              {[c.grade, c.subject, c.year].filter(Boolean).join(" · ") || "verified"}
            </span>
          </div>
        ))}
    </Panel>
  );
}
