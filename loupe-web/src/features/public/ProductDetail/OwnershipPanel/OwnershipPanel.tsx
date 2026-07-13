import {
  ScanLine,
  PencilLine,
  Upload,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { useCardHoldings, type CardHolding } from "@loupe/core";
import { Panel, Badge, Delta } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { gradeLabel } from "@/features/collection/houses";
import { formatMoney } from "@/lib/format";
import { cx } from "@/lib/cx";
import styles from "./OwnershipPanel.module.scss";

const ACQUIRED: Record<
  NonNullable<CardHolding["acquiredVia"]>,
  { label: string; icon: React.ReactNode }
> = {
  scan: { label: "Scanned", icon: <ScanLine size={11} /> },
  manual: { label: "Added", icon: <PencilLine size={11} /> },
  import: { label: "Imported", icon: <Upload size={11} /> },
};

const usd = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "—"
    : formatMoney({ amount: n, currency: "USD" });

/** A signed `+$X (+Y%)` figure, coloured by sign. Null when no P/L is known. */
function Pnl({
  usdValue,
  pct,
}: {
  usdValue: number | null | undefined;
  pct: number | null | undefined;
}) {
  if (usdValue === null || usdValue === undefined) return <span>—</span>;
  const positive = usdValue >= 0;
  return (
    <span className={cx(styles.pnl, positive ? styles.up : styles.down)}>
      {positive ? "+" : "−"}
      {usd(Math.abs(usdValue))}
      {pct !== null && pct !== undefined && (
        <span className={styles.pnl__pct}>
          {" "}
          ({positive ? "+" : ""}
          {pct.toFixed(1)}%)
        </span>
      )}
    </span>
  );
}

/**
 * The signed-in user's own copies of this card — the per-user side of a card's
 * identity. Each holding shows its grade, whether it's graded vs raw, how it
 * was acquired, cost basis, current estimated value, and unrealized P/L, with
 * a rolled-up summary across all copies.
 *
 * Renders nothing for guests, for cards the user doesn't own, or before the
 * `/ownership` endpoint is deployed (the query error simply yields no data) —
 * so it degrades cleanly everywhere.
 */
/** Compact "C 9.5 · CR 9 · E 9.5 · S 10" line from the subgrades blob.
 *  Tolerates both flat numbers and the richer `{ score }` object shape.
 *  Mirrors mobile's CardOwnershipSection so both clients show sub-scores. */
function subgradeLine(sg: Record<string, unknown> | null | undefined): string | null {
  if (!sg) return null;
  const AXES: Array<[string, string]> = [
    ["centering", "C"],
    ["corners", "CR"],
    ["edges", "E"],
    ["surface", "S"],
  ];
  const bits: string[] = [];
  for (const [key, label] of AXES) {
    const raw = sg[key];
    const n =
      typeof raw === "number"
        ? raw
        : typeof (raw as { score?: unknown } | null)?.score === "number"
          ? (raw as { score: number }).score
          : null;
    if (n != null && Number.isFinite(n)) bits.push(`${label} ${n}`);
  }
  return bits.length ? bits.join(" · ") : null;
}

export function OwnershipPanel({ cardId }: { cardId: string }) {
  const { user } = useAuth();
  const { data } = useCardHoldings(cardId, Boolean(user));

  if (!user || !data?.owned || data.holdings.length === 0) return null;

  const { copies, holdings, costBasisUsd, holdingValueUsd, unrealizedPlUsd, unrealizedPlPct } =
    data;

  return (
    <section className={styles.root}>
      <header className={styles.head}>
        <h2 className={styles.title}>
          <Layers size={16} /> Your copies
          <span className={styles.count}>×{copies}</span>
        </h2>
        {(costBasisUsd != null || holdingValueUsd != null) && (
          <div className={styles.summary}>
            <div className={styles.summary__cell}>
              <span className={styles.summary__label}>Cost basis</span>
              <span className={styles.summary__value}>{usd(costBasisUsd)}</span>
            </div>
            <div className={styles.summary__cell}>
              <span className={styles.summary__label}>Value</span>
              <span className={styles.summary__value}>{usd(holdingValueUsd)}</span>
            </div>
            <div className={styles.summary__cell}>
              <span className={styles.summary__label}>Unrealized P/L</span>
              <span className={styles.summary__value}>
                <Pnl usdValue={unrealizedPlUsd} pct={unrealizedPlPct} />
              </span>
            </div>
          </div>
        )}
      </header>

      <Panel padding="lg" className={styles.list}>
        {holdings.map((h) => {
          const acq = h.acquiredVia ? ACQUIRED[h.acquiredVia] : null;
          return (
            <div key={h.holdingId} className={styles.row}>
              <div className={styles.row__id}>
                <Badge tone={h.isGraded ? "mint" : "neutral"}>
                  {gradeLabel(h.house, h.grade, h.condition)}
                </Badge>
                <div className={styles.row__tags}>
                  {h.isGraded ? (
                    <span className={cx(styles.tag, styles["tag--graded"])}>
                      <ShieldCheck size={11} /> Graded
                    </span>
                  ) : (
                    <span className={styles.tag}>Raw</span>
                  )}
                  {acq && (
                    <span className={styles.tag}>
                      {acq.icon} {acq.label}
                    </span>
                  )}
                  {h.daysHeld != null && (
                    <span className={styles.tag}>{h.daysHeld}d held</span>
                  )}
                  {subgradeLine(h.subgrades) && (
                    <span className={styles.tag}>{subgradeLine(h.subgrades)}</span>
                  )}
                </div>
              </div>

              <div className={styles.row__figs}>
                <div className={styles.fig}>
                  <span className={styles.fig__label}>Cost</span>
                  <span className={styles.fig__value}>{usd(h.purchasePriceUsd)}</span>
                </div>
                <div className={styles.fig}>
                  <span className={styles.fig__label}>Value</span>
                  <span className={styles.fig__value}>{usd(h.estimatedValueUsd)}</span>
                </div>
                <div className={styles.fig}>
                  <span className={styles.fig__label}>P/L</span>
                  <span className={styles.fig__value}>
                    {h.unrealizedPlPct != null ? (
                      <Delta percent={h.unrealizedPlPct} variant="arrow" />
                    ) : (
                      <Pnl usdValue={h.unrealizedPlUsd} pct={null} />
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </Panel>
    </section>
  );
}
