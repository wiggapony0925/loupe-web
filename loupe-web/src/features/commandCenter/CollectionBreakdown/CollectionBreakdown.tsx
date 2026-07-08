import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import {
  useAnalyticsOverview,
  type AnalyticsGradeBucket,
  type AnalyticsConcentration,
} from "@loupe/core";
import { useActiveCollection } from "@/providers/ActiveCollectionProvider";
import { Panel } from "@/components";
import { formatMoney } from "@/lib/format";
import styles from "./CollectionBreakdown.module.scss";

/**
 * A portfolio-grade "breakdown" strip — quality (grade distribution) next to
 * risk (concentration / largest holding) — reusing the same
 * `/v1/analytics/overview` round-trip the page already makes (React Query
 * dedupes). It's a compact preview that links to the full Analytics page, so
 * the dashboard reads like an investor's account view, not just a card grid.
 * Self-hides for empty accounts.
 */
export function CollectionBreakdown() {
  const { collectionId } = useActiveCollection();
  const { data } = useAnalyticsOverview(collectionId);
  const stats = data?.stats;
  if (!data || !stats || stats.holdings === 0) return null;

  const grades = data.gradeDistribution ?? [];
  const conc = data.concentration;

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <span className={styles.eyebrow}>Your collection</span>
          <h2 className={styles.title}>Collection breakdown</h2>
        </div>
        <Link to="/app/analytics" className={styles.link}>
          Full analytics <ArrowUpRight size={14} />
        </Link>
      </div>

      <div className={styles.grid}>
        <Panel padding="lg" className={styles.panel}>
          <span className={styles.panelLabel}>Grade distribution</span>
          {grades.length === 0 ? (
            <p className={styles.empty}>Grade your cards to see quality spread.</p>
          ) : (
            <GradeBars buckets={grades} />
          )}
        </Panel>

        <Panel padding="lg" className={styles.panel}>
          <span className={styles.panelLabel}>Concentration</span>
          {!conc ? (
            <p className={styles.empty}>Appears once you hold a few cards.</p>
          ) : (
            <Concentration conc={conc} />
          )}
        </Panel>
      </div>
    </section>
  );
}

function GradeBars({ buckets }: { buckets: AnalyticsGradeBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const total = buckets.reduce((sum, b) => sum + b.count, 0) || 1;
  return (
    <div className={styles.bars}>
      {buckets.map((b) => (
        <div key={b.bucket} className={styles.bar}>
          <span className={styles.barLabel}>{b.bucket}</span>
          <span className={styles.barTrack}>
            <span className={styles.barFill} style={{ width: `${(b.count / max) * 100}%` }} />
          </span>
          <span className={styles.barValue}>
            {b.count}
            <span className={styles.barPct}>{Math.round((b.count / total) * 100)}%</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function Concentration({ conc }: { conc: AnalyticsConcentration }) {
  const top1 = Math.max(0, Math.min(100, conc.top1Pct));
  const top3 = Math.max(top1, Math.min(100, conc.top3Pct));
  const top5 = Math.max(top3, Math.min(100, conc.top5Pct));
  // Stacked allocation bar: top-1 (brightest) → next two → next two → the rest.
  const segs = [
    { w: top1, cls: styles.seg1 },
    { w: top3 - top1, cls: styles.seg2 },
    { w: top5 - top3, cls: styles.seg3 },
    { w: 100 - top5, cls: styles.segRest },
  ];
  return (
    <div className={styles.conc}>
      <div className={styles.allocBar} aria-hidden>
        {segs.map(
          (s, i) => s.w > 0 && <span key={i} className={s.cls} style={{ width: `${s.w}%` }} />,
        )}
      </div>
      <div className={styles.concStats}>
        <span className={styles.concStat}>
          <span className={styles.concPct}>{Math.round(top1)}%</span>
          <span className={styles.concKey}>Top 1</span>
        </span>
        <span className={styles.concStat}>
          <span className={styles.concPct}>{Math.round(top3)}%</span>
          <span className={styles.concKey}>Top 3</span>
        </span>
        <span className={styles.concStat}>
          <span className={styles.concPct}>{Math.round(top5)}%</span>
          <span className={styles.concKey}>Top 5</span>
        </span>
      </div>
      {conc.top1.cardName && (
        <p className={styles.concNote}>
          Largest holding <strong>{conc.top1.cardName}</strong> ·{" "}
          {formatMoney({ amount: conc.top1.valueUsd, currency: "USD" })}
        </p>
      )}
    </div>
  );
}
