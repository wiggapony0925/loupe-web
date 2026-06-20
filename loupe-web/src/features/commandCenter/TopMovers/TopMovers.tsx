import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  useAnalyticsOverview,
  usePublicSparklines,
  type AnalyticsMoverRow,
} from "@loupe/core";
import { Panel, CardThumb, Sparkline, Delta } from "@/components";
import { formatMoney } from "@/lib/format";
import styles from "./TopMovers.module.scss";

/**
 * Biggest 1-year price swings on the cards you own — the web twin of the
 * mobile Command Center's Top Movers, with a Robinhood-style sparkline per
 * row. Self-hides when the vault has no enriched movers yet. One batched
 * sparkline request covers every visible row.
 */
export function TopMovers({ onCard }: { onCard: (id: string) => void }) {
  const { data } = useAnalyticsOverview();
  const gainers = data?.movers.gainers ?? [];
  const losers = data?.movers.losers ?? [];

  const ids = useMemo(
    () =>
      [...gainers, ...losers]
        .map((m) => m.cardId)
        .filter((id): id is string => Boolean(id)),
    [gainers, losers],
  );
  const { data: sparks } = usePublicSparklines(ids, ids.length > 0);
  const sparkMap = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const s of sparks ?? [])
      if (s.points.length > 1) m.set(s.cardId, s.points);
    return m;
  }, [sparks]);

  if (gainers.length === 0 && losers.length === 0) return null;

  return (
    <section className={styles.movers}>
      <div className={styles.head}>
        <h2 className={styles.title}>Your movers</h2>
        <span className={styles.sub}>
          Biggest 1-year swings in your collection.
        </span>
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
    <Panel padding="none" className={styles.col}>
      <div className={styles.colHead}>
        <Icon
          size={15}
          className={tone === "up" ? styles.iconUp : styles.iconDown}
        />
        <span>{label}</span>
      </div>
      {rows.map((m, i) => {
        const spark = m.cardId ? sparkMap.get(m.cardId) : undefined;
        return (
          <button
            key={m.gradeId}
            type="button"
            className={styles.row}
            onClick={() => m.cardId && onCard(m.cardId)}
            data-first={i === 0 || undefined}
          >
            <span className={styles.thumb}>
              <CardThumb
                src={m.cardImageUrl ?? ""}
                alt={m.cardName ?? "Card"}
                size="sm"
              />
            </span>
            <span className={styles.meta}>
              <span className={styles.name}>{m.cardName ?? "Card"}</span>
              <span className={styles.set}>{m.setName ?? ""}</span>
            </span>
            {spark && (
              <Sparkline
                data={spark}
                width={56}
                height={24}
                fill={false}
                strokeWidth={1.5}
              />
            )}
            <span className={styles.right}>
              <span className={styles.value}>
                {formatMoney({ amount: m.valueUsd, currency: "USD" })}
              </span>
              <Delta percent={m.changePct1y} variant="arrow" />
            </span>
          </button>
        );
      })}
    </Panel>
  );
}
