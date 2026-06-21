import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Award, Layers, Sparkles, Wallet } from "lucide-react";
import {
  useAnalyticsOverview,
  usePortfolioHistory,
  type AnalyticsConcentration,
  type AnalyticsMoverRow,
  type AnalyticsSetIndex,
} from "@loupe/core";
import {
  Panel,
  Stat,
  Delta,
  CardThumb,
  NoteCard,
  Skeleton,
  Button,
  MetricCard,
  BarChart,
  DonutChart,
  type BarDatum,
  type DonutDatum,
} from "@/components";
import { formatCompactMoney, formatMoney } from "@/lib/format";
import styles from "./Analytics.module.scss";

const usd = (n: number) => formatMoney({ amount: n, currency: "USD" });

/** Performance analytics for the user's collection — one /v1/analytics/overview round-trip. */
export function Analytics() {
  const { data, isLoading, isError, refetch } = useAnalyticsOverview();
  const history = usePortfolioHistory("1Y");
  const navigate = useNavigate();
  const open = (id: string) => navigate(`/cards/${encodeURIComponent(id)}`);

  if (isError) {
    return (
      <div className={styles.page}>
        <Header />
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
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.hero}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={116} radius={20} />
          ))}
        </div>
        <Skeleton height={260} radius={20} />
        <Skeleton height={220} radius={20} />
      </div>
    );
  }

  const { stats, kpis, gradeDistribution, yearDistribution, setIndexes, movers, concentration } = data;
  const empty = stats.holdings === 0;
  const yearDelta = history.data?.deltaPct;

  const gradeBars: BarDatum[] = gradeDistribution.map((b) => ({ label: b.bucket, value: b.count }));
  const gradeTotal = gradeDistribution.reduce((s, b) => s + b.count, 0);
  const decadeBars: BarDatum[] = yearDistribution.map((b) => ({ label: `${b.decade}s`, value: b.valueUsd }));
  const decadeTotal = yearDistribution.reduce((s, b) => s + b.valueUsd, 0);
  const allocation: DonutDatum[] = setIndexes
    .filter((s) => s.totalValueUsd > 0)
    .map((s) => ({ label: s.setName, value: s.totalValueUsd }));

  return (
    <div className={styles.page}>
      <Header />

      {empty && (
        <NoteCard
          title="Your portfolio is empty"
          message="Scan or add cards in the app to unlock live performance, grade quality, vintage, and concentration analytics here."
          action={
            <Button variant="secondary" size="sm" onClick={() => navigate("/cards")}>
              Browse cards
            </Button>
          }
        />
      )}

      {/* Hero metrics */}
      <div className={styles.hero}>
        <MetricCard
          accent
          tone="mint"
          icon={<Wallet size={16} />}
          label="Collection value"
          value={usd(stats.totalValueUsd)}
          changePct={yearDelta}
          caption={yearDelta != null ? "vs last year" : `${stats.holdings.toLocaleString()} cards`}
        />
        <MetricCard
          tone="blue"
          icon={<Layers size={16} />}
          label="Holdings"
          value={stats.holdings.toLocaleString()}
          caption={`across ${stats.uniqueSets.toLocaleString()} ${
            stats.uniqueSets === 1 ? "set" : "sets"
          } · avg ${usd(stats.avgValueUsd)}`}
        />
        <MetricCard
          tone="purple"
          icon={<Award size={16} />}
          label="Avg grade"
          value={stats.avgGrade ? stats.avgGrade.toFixed(1) : "—"}
          caption={`${stats.gemRatePct.toFixed(0)}% gem rate`}
        />
        <MetricCard
          tone="amber"
          icon={<Sparkles size={16} />}
          label="Oldest card"
          value={stats.oldestYear ? String(stats.oldestYear) : "—"}
          caption={stats.oldestYear ? "vintage anchor" : "no dated cards yet"}
        />
      </div>

      {/* Distributions */}
      <div className={styles.cols}>
        <Section eyebrow="Quality" title="Grade distribution">
          {gradeBars.length === 0 ? (
            <EmptyHint text="Grade your cards to see the quality spread." />
          ) : (
            <Panel padding="lg" raised className={styles.chartPanel}>
              <BarChart
                data={gradeBars}
                height={200}
                backdrop={gradeTotal.toLocaleString()}
                format={(n) => n.toLocaleString()}
                ariaLabel="Grade distribution"
              />
            </Panel>
          )}
        </Section>
        <Section eyebrow="Vintage" title="Value by decade">
          {decadeBars.length === 0 ? (
            <EmptyHint text="Add dated cards to see value by decade." />
          ) : (
            <Panel padding="lg" raised className={styles.chartPanel}>
              <BarChart
                data={decadeBars}
                height={200}
                backdrop={formatCompactMoney(decadeTotal)}
                format={(n) => formatCompactMoney(n)}
                ariaLabel="Value by decade"
              />
            </Panel>
          )}
        </Section>
      </div>

      {/* Set indexes */}
      <Section eyebrow="Markets" title="Set indexes" subtitle="How your value is weighted across sets.">
        {setIndexes.length === 0 ? (
          <EmptyHint text="No sets yet — add cards to see how each set is weighted." />
        ) : (
          <Panel padding="none" raised className={styles.list}>
            {setIndexes.map((s) => (
              <SetIndexRow key={s.setName} row={s} />
            ))}
          </Panel>
        )}
      </Section>

      {/* Allocation (donut) + concentration */}
      <div className={styles.cols}>
        <Section eyebrow="Allocation" title="Value by set">
          {allocation.length === 0 ? (
            <EmptyHint text="Add cards to see how your value is allocated." />
          ) : (
            <Panel padding="lg" raised className={styles.chartPanel}>
              <DonutChart
                data={allocation}
                centerValue={formatCompactMoney(stats.totalValueUsd)}
                centerLabel="total"
                format={(n) => formatCompactMoney(n)}
                ariaLabel="Value allocation by set"
              />
            </Panel>
          )}
        </Section>
        <Section eyebrow="Risk" title="Concentration">
          {!concentration ? (
            <EmptyHint text="Concentration appears once you hold a few cards." />
          ) : (
            <Panel padding="lg" raised className={styles.chartPanel}>
              <Concentration conc={concentration} />
            </Panel>
          )}
        </Section>
      </div>

      {/* Movers */}
      <div className={styles.cols}>
        <Section eyebrow="Movers" title="Top gainers">
          <MoverList rows={movers.gainers} emptyHint="No gainers yet." onOpen={open} />
        </Section>
        <Section eyebrow="Movers" title="Top losers">
          <MoverList rows={movers.losers} emptyHint="No losers yet." onOpen={open} />
        </Section>
      </div>

      {/* Scanning */}
      <Section eyebrow="Activity" title="Scanning">
        <div className={styles.stats}>
          <Stat label="Total scans" value={kpis.totalScans.toLocaleString()} />
          <Stat label="Scan avg grade" value={kpis.avgGrade ? kpis.avgGrade.toFixed(1) : "—"} />
          <Stat label="Scan gem rate" value={`${kpis.gemRatePct.toFixed(0)}%`} />
          <Stat
            label="Graders"
            value={`PSA ${kpis.graderSplit.psa} · BGS ${kpis.graderSplit.bgs} · CGC ${kpis.graderSplit.cgc}`}
          />
        </div>
      </Section>
    </div>
  );
}

function Header() {
  return (
    <header className={styles.head}>
      <p className={styles.eyebrow}>Performance</p>
      <h1 className={styles.title}>Analytics</h1>
    </header>
  );
}

function Section({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionEyebrow}>{eyebrow}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {subtitle && <span className={styles.sectionSub}>{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className={styles.empty}>{text}</p>;
}

function Concentration({ conc }: { conc: AnalyticsConcentration }) {
  const top1 = Math.max(0, Math.min(100, conc.top1Pct));
  const top3 = Math.max(top1, Math.min(100, conc.top3Pct));
  const top5 = Math.max(top3, Math.min(100, conc.top5Pct));
  const segs = [
    { w: top1, cls: styles.seg1 },
    { w: top3 - top1, cls: styles.seg2 },
    { w: top5 - top3, cls: styles.seg3 },
    { w: 100 - top5, cls: styles.segRest },
  ];
  return (
    <div className={styles.conc}>
      <div className={styles.alloc} aria-hidden>
        {segs.map((s, i) => s.w > 0 && <span key={i} className={s.cls} style={{ width: `${s.w}%` }} />)}
      </div>
      <div className={styles.concStats}>
        <Stat label="Top 1" value={`${Math.round(top1)}%`} />
        <Stat label="Top 3" value={`${Math.round(top3)}%`} />
        <Stat label="Top 5" value={`${Math.round(top5)}%`} />
      </div>
      {conc.top1.cardName && (
        <p className={styles.concNote}>
          Largest holding <strong>{conc.top1.cardName}</strong> · {usd(conc.top1.valueUsd)}
        </p>
      )}
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
    <Panel padding="none" raised className={styles.list}>
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
            <Delta percent={m.changePct1y} variant="arrow" />
          </span>
        </button>
      ))}
    </Panel>
  );
}
