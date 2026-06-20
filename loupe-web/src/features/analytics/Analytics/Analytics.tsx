import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAnalyticsOverview,
  type AnalyticsGradeBucket,
  type AnalyticsMoverRow,
  type AnalyticsSetIndex,
  type AnalyticsYearBucket,
} from "@loupe/core";
import { Panel, Stat, Delta, CardThumb, NoteCard, Skeleton, Button } from "@/components";
import { formatMoney } from "@/lib/format";
import styles from "./Analytics.module.scss";

const usd = (n: number) => formatMoney({ amount: n, currency: "USD" });

/** Performance analytics for the user's collection — one /v1/analytics/overview round-trip. */
export function Analytics() {
  const { data, isLoading, isError, refetch } = useAnalyticsOverview();
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Performance</p>
        <h1 className={styles.title}>Analytics</h1>
      </header>

      {isError ? (
        <NoteCard
          variant="warning"
          title="Couldn't load analytics"
          message="The backend is unreachable right now."
          action={
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      ) : isLoading || !data ? (
        <div className={styles.section}>
          <Skeleton height={120} radius={14} />
          <Skeleton height={220} radius={14} />
          <Skeleton height={180} radius={14} />
        </div>
      ) : (
        <>
          {/* Portfolio headline */}
          <Panel padding="lg" raised className={styles.value}>
            <span className={styles.valueLabel}>Collection value</span>
            <span className={styles.valueAmount}>{usd(data.stats.totalValueUsd)}</span>
            <span className={styles.valueMeta}>
              {data.stats.holdings.toLocaleString()} cards · {data.stats.uniqueSets.toLocaleString()} sets
            </span>
            {data.stats.holdings === 0 && (
              <p className={styles.onboard}>
                Your portfolio is empty. Scan or add cards in the mobile app to see live performance here.
              </p>
            )}
          </Panel>

          {/* Book stats */}
          <Section eyebrow="Snapshot" title="Book stats">
            <div className={styles.stats}>
              <Stat label="Holdings" value={data.stats.holdings.toLocaleString()} />
              <Stat label="Unique sets" value={data.stats.uniqueSets.toLocaleString()} />
              <Stat label="Avg grade" value={data.stats.avgGrade ? data.stats.avgGrade.toFixed(1) : "—"} />
              <Stat label="Gem rate" value={`${data.stats.gemRatePct.toFixed(0)}%`} />
              <Stat label="Avg value" value={usd(data.stats.avgValueUsd)} />
              <Stat label="Oldest" value={data.stats.oldestYear ? String(data.stats.oldestYear) : "—"} />
            </div>
          </Section>

          {/* Grade distribution */}
          <Section eyebrow="Quality" title="Grade distribution">
            <Panel padding="lg">
              <GradeBars buckets={data.gradeDistribution} />
            </Panel>
          </Section>

          {/* Set indexes */}
          <Section eyebrow="Markets" title="Set indexes">
            {data.setIndexes.length === 0 ? (
              <EmptyHint text="No sets yet — add cards to see how each set is weighted." />
            ) : (
              <Panel padding="none" className={styles.list}>
                {data.setIndexes.map((s) => (
                  <SetIndexRow key={s.setName} row={s} />
                ))}
              </Panel>
            )}
          </Section>

          {/* Gainers / losers */}
          <div className={styles.cols}>
            <Section eyebrow="Movers" title="Top gainers">
              <MoverList rows={data.movers.gainers} emptyHint="No gainers yet." onOpen={(id) => navigate(`/cards/${encodeURIComponent(id)}`)} />
            </Section>
            <Section eyebrow="Movers" title="Top losers">
              <MoverList rows={data.movers.losers} emptyHint="No losers yet." onOpen={(id) => navigate(`/cards/${encodeURIComponent(id)}`)} />
            </Section>
          </div>

          {/* Concentration */}
          <Section eyebrow="Risk" title="Concentration">
            {!data.concentration ? (
              <EmptyHint text="Concentration appears once you hold a few cards." />
            ) : (
              <Panel padding="lg" className={styles.conc}>
                <div className={styles.concStats}>
                  <Stat label="Top 1" value={`${data.concentration.top1Pct.toFixed(0)}%`} />
                  <Stat label="Top 3" value={`${data.concentration.top3Pct.toFixed(0)}%`} />
                  <Stat label="Top 5" value={`${data.concentration.top5Pct.toFixed(0)}%`} />
                </div>
                {data.concentration.top1.cardName && (
                  <p className={styles.concNote}>
                    Largest holding: <strong>{data.concentration.top1.cardName}</strong> ·{" "}
                    {usd(data.concentration.top1.valueUsd)}
                  </p>
                )}
              </Panel>
            )}
          </Section>

          {/* By decade */}
          <Section eyebrow="Vintage" title="By decade">
            {data.yearDistribution.length === 0 ? (
              <EmptyHint text="Add dated cards to see your collection by decade." />
            ) : (
              <Panel padding="lg">
                <DecadeBars buckets={data.yearDistribution} />
              </Panel>
            )}
          </Section>

          {/* Scan KPIs */}
          <Section eyebrow="Activity" title="Scanning">
            <div className={styles.stats}>
              <Stat label="Total scans" value={data.kpis.totalScans.toLocaleString()} />
              <Stat label="Avg grade" value={data.kpis.avgGrade ? data.kpis.avgGrade.toFixed(1) : "—"} />
              <Stat label="Gem rate" value={`${data.kpis.gemRatePct.toFixed(0)}%`} />
              <Stat
                label="Graders"
                value={`PSA ${data.kpis.graderSplit.psa} · BGS ${data.kpis.graderSplit.bgs} · CGC ${data.kpis.graderSplit.cgc}`}
              />
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionEyebrow}>{eyebrow}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className={styles.empty}>{text}</p>;
}

function GradeBars({ buckets }: { buckets: AnalyticsGradeBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div className={styles.bars}>
      {buckets.map((b) => (
        <div key={b.bucket} className={styles.bar}>
          <span className={styles.barLabel}>{b.bucket}</span>
          <span className={styles.barTrack}>
            <span className={styles.barFill} style={{ width: `${(b.count / max) * 100}%` }} />
          </span>
          <span className={styles.barValue}>{b.count}</span>
        </div>
      ))}
    </div>
  );
}

function DecadeBars({ buckets }: { buckets: AnalyticsYearBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.valueUsd));
  return (
    <div className={styles.bars}>
      {buckets.map((b) => (
        <div key={b.decade} className={styles.bar}>
          <span className={styles.barLabel}>{b.decade}s</span>
          <span className={styles.barTrack}>
            <span className={styles.barFill} style={{ width: `${(b.valueUsd / max) * 100}%` }} />
          </span>
          <span className={styles.barValue}>{usd(b.valueUsd)}</span>
        </div>
      ))}
    </div>
  );
}

function SetIndexRow({ row }: { row: AnalyticsSetIndex }) {
  return (
    <div className={styles.setRow}>
      <div className={styles.setMain}>
        <span className={styles.setName}>{row.setName}</span>
        <span className={styles.setMeta}>
          {row.count} cards · {row.sharePct.toFixed(0)}%
        </span>
        <span className={styles.setBarTrack}>
          <span className={styles.setBarFill} style={{ width: `${Math.min(100, row.sharePct)}%` }} />
        </span>
      </div>
      <div className={styles.setRight}>
        <span className={styles.setValue}>{usd(row.totalValueUsd)}</span>
        {row.changePct1y !== null && <Delta percent={row.changePct1y} />}
      </div>
    </div>
  );
}

function MoverList({
  rows,
  emptyHint,
  onOpen,
}: {
  rows: AnalyticsMoverRow[];
  emptyHint: string;
  onOpen: (id: string) => void;
}) {
  if (rows.length === 0) return <EmptyHint text={emptyHint} />;
  return (
    <Panel padding="none" className={styles.list}>
      {rows.map((m) => (
        <button
          key={m.gradeId}
          className={styles.mover}
          onClick={() => m.cardId && onOpen(m.cardId)}
          disabled={!m.cardId}
        >
          <span className={styles.moverThumb}>
            <CardThumb src={m.cardImageUrl ?? ""} alt={m.cardName ?? "Card"} size="sm" />
          </span>
          <span className={styles.moverText}>
            <span className={styles.moverName}>{m.cardName ?? "Card"}</span>
            {m.setName && <span className={styles.moverSet}>{m.setName}</span>}
          </span>
          <span className={styles.moverRight}>
            <span className={styles.moverValue}>{usd(m.valueUsd)}</span>
            <Delta percent={m.changePct1y} />
          </span>
        </button>
      ))}
    </Panel>
  );
}
