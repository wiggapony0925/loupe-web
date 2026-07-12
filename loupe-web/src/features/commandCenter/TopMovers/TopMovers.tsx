import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useAnalyticsOverview, usePublicSparklines, type AnalyticsMoverRow } from "@loupe/core";
import { useActiveCollection } from "@/providers/ActiveCollectionProvider";
import { Panel, CardThumb, Sparkline, Delta } from "@/components";
import { cx } from "@/lib/cx";
import { formatMoney, formatSignedMoney } from "@/lib/format";
import styles from "./TopMovers.module.scss";

/**
 * Biggest 1-year price swings on the cards you own, presented like a brokerage
 * watchlist: each card is a "ticker" with art, set symbol, a trend-colored
 * sparkline and a last-price + signed $/% change block (Robinhood styling).
 * Self-hides when the vault has no enriched movers yet. One batched sparkline
 * request covers every visible row.
 */
export function TopMovers({ onCard }: { onCard: (id: string) => void }) {
  const { collectionId } = useActiveCollection();
  const { data } = useAnalyticsOverview(collectionId);
  const gainers = useMemo(() => data?.movers.gainers ?? [], [data]);
  const losers = useMemo(() => data?.movers.losers ?? [], [data]);

  const ids = useMemo(
    () => [...gainers, ...losers].map((m) => m.cardId).filter((id): id is string => Boolean(id)),
    [gainers, losers],
  );
  const { data: sparks } = usePublicSparklines(ids, ids.length > 0);
  const sparkMap = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const s of sparks ?? []) if (s.points.length > 1) m.set(s.cardId, s.points);
    return m;
  }, [sparks]);

  if (gainers.length === 0 && losers.length === 0) return null;

  return (
    <section className={styles.movers}>
      <div className={styles.head}>
        <h2 className={styles.title}>Your movers</h2>
        <span className={styles.sub}>Biggest swings in your collection.</span>
        <span className={styles.window}>1Y</span>
      </div>
      <div className={styles.cols}>
        <MoverColumn
          label="Top gainers"
          tone="up"
          rows={gainers}
          sparkMap={sparkMap}
          onCard={onCard}
        />
        <MoverColumn
          label="Top losers"
          tone="down"
          rows={losers}
          sparkMap={sparkMap}
          onCard={onCard}
        />
      </div>
    </section>
  );
}

function MoverColumn({
  label,
  tone,
  rows,
  sparkMap,
  onCard,
}: {
  label: string;
  tone: "up" | "down";
  rows: AnalyticsMoverRow[];
  sparkMap: Map<string, number[]>;
  onCard: (id: string) => void;
}) {
  if (rows.length === 0) return null;
  const Icon = tone === "up" ? TrendingUp : TrendingDown;
  return (
    <Panel
      padding="none"
      className={cx(styles.col, tone === "up" ? styles.toneUp : styles.toneDown)}
    >
      <div className={styles.colHead}>
        <span className={styles.colHeadLabel}>
          <Icon size={14} className={styles.colIcon} />
          {label}
        </span>
        <span className={styles.colCount}>{rows.length}</span>
      </div>
      <ol className={styles.list}>
        {rows.map((m, i) => {
          const spark = m.cardId ? sparkMap.get(m.cardId) : undefined;
          const pct = m.changePct1y ?? 0;
          // Absolute 1Y move comes from the backend (same history baseline
          // as the %). The derivation from pct is only a fallback for
          // backends that predate `changeUsd1y` — delete it after deploy.
          const abs =
            m.changeUsd1y ??
            (pct > -100 ? m.valueUsd - m.valueUsd / (1 + pct / 100) : undefined);
          return (
            <li key={m.gradeId}>
              <button
                type="button"
                className={styles.row}
                onClick={() => m.cardId && onCard(m.cardId)}
              >
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.thumb}>
                  <CardThumb src={m.cardImageUrl ?? ""} alt={m.cardName ?? "Card"} size="sm" />
                </span>
                <span className={styles.meta}>
                  <span className={styles.name}>{m.cardName ?? "Card"}</span>
                  <span className={styles.ticker}>{m.setName ?? "—"}</span>
                </span>
                {spark && (
                  <span className={styles.sparkWrap}>
                    <Sparkline data={spark} width={64} height={28} fill strokeWidth={1.75} />
                  </span>
                )}
                <span className={styles.right}>
                  <span className={styles.value}>
                    {formatMoney({ amount: m.valueUsd, currency: "USD" })}
                  </span>
                  <Delta percent={pct} variant="arrow" />
                  {abs !== undefined && (
                    <span className={styles.abs}>{formatSignedMoney(abs)}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
