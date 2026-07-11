import { useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Flame,
  Gavel,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  useCardAnalytics,
  useCardComps,
  useCardListings,
  useGrades,
  type MarketSnapshot,
  type Money,
} from "@loupe/core";
import { cx } from "@/lib/cx";
import { formatMoney } from "@/lib/format";
import styles from "./CardInsights.module.scss";

type Tone = "neutral" | "mint" | "rose" | "amber";

/* ── shared helpers (mirrors mobile CardInsights) ───────────────────── */

function formatRelative(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const diffSec = Math.max(0, (Date.now() - t) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 86_400) return `${Math.round(diffSec / 3600)}h ago`;
  const days = Math.round(diffSec / 86_400);
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

function findGrade(snapshot: MarketSnapshot, house: string, gradeLabel: string) {
  const block = snapshot.houses.find((b) => b.house === house);
  return block?.grades.find((g) => g.gradeLabel === gradeLabel);
}

const usd = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/* ── 1. Quick stats ─────────────────────────────────────────────────── */

export function QuickStats({
  snapshot,
  cardId,
}: {
  snapshot: MarketSnapshot | null | undefined;
  cardId: string;
}) {
  // Spread / volatility / liquidity come from the backend
  // `/v1/cards/{id}/analytics` — the SAME payload CardAnalyticsPanel and
  // mobile's CardQuickStats render (React Query dedupes), so every surface
  // shows identical figures and the client never re-derives them.
  const { data: analytics } = useCardAnalytics(cardId);
  // Comps are only the last-sale fallback now — never re-aggregated.
  const { data: comps } = useCardComps(cardId, { days: 90 });

  const spread = analytics?.gradePremium ?? null;
  const vol = analytics?.volatilityPct ?? null;
  const last30 = analytics?.liquidity30d ?? 0;

  const lastSaleRel = formatRelative(
    snapshot?.summary.lastSaleAt ?? comps?.[0]?.soldAt ?? null,
  );

  if (spread === null && vol === null && last30 === 0 && lastSaleRel === null)
    return null;

  return (
    <div className={styles.tiles}>
      <Tile label="Spread" value={spread !== null ? `${spread.toFixed(1)}×` : "—"} sub="PSA 10 / Raw" />
      <Tile
        label="Volatility"
        value={vol !== null ? `${vol.toFixed(1)}%` : "—"}
        sub="90d stdev"
        tone={vol !== null && vol > 25 ? "amber" : "neutral"}
      />
      <Tile
        label="Liquidity"
        value={`${last30}`}
        sub="sales · 30d"
        tone={last30 >= 10 ? "mint" : last30 === 0 ? "rose" : "neutral"}
      />
      <Tile
        label="Last sale"
        value={lastSaleRel ?? "—"}
        sub={snapshot?.summary.primaryHouse?.toUpperCase()}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
}) {
  return (
    <div className={styles.tile}>
      <span className={styles.tile__label}>{label}</span>
      <span
        className={cx(styles.tile__value, tone !== "neutral" && styles[`tone-${tone}`])}
      >
        {value}
      </span>
      {sub && <span className={styles.tile__sub}>{sub}</span>}
    </div>
  );
}

/* ── 2. Market signals (chips) ──────────────────────────────────────── */

function Chip({
  icon,
  label,
  tone = "neutral",
}: {
  icon?: React.ReactNode;
  label: string;
  tone?: Tone;
}) {
  return (
    <span className={cx(styles.chip, styles[`tone-${tone}`])}>
      {icon}
      {label}
    </span>
  );
}

export function MarketSignals({
  snapshot,
  cardId,
}: {
  snapshot: MarketSnapshot | null | undefined;
  cardId: string;
}) {
  const { data: listings } = useCardListings(cardId);

  if (!snapshot) return null;

  const oneYear = snapshot.history?.["1y"];
  const hi = oneYear?.summary.max ?? null;
  const lo = oneYear?.summary.min ?? null;
  const current = oneYear?.summary.current ?? snapshot.summary.popTop?.amount ?? null;
  const offHighPct =
    hi !== null && current !== null && hi > 0 ? ((current - hi) / hi) * 100 : null;

  const pts = oneYear?.points ?? [];
  const hiPoint = hi !== null ? pts.reduce<(typeof pts)[number] | null>((b, p) => (b === null || p.price > b.price ? p : b), null) : null;
  const loPoint = lo !== null ? pts.reduce<(typeof pts)[number] | null>((b, p) => (b === null || p.price < b.price ? p : b), null) : null;
  const hiAgo = hiPoint ? formatRelative(new Date(hiPoint.t).toISOString()) : null;
  const loAgo = loPoint ? formatRelative(new Date(loPoint.t).toISOString()) : null;

  const ch30 = snapshot.history?.["30d"]?.summary.changePct ?? null;
  const ch90 = snapshot.history?.["90d"]?.summary.changePct ?? null;
  const ch1y = snapshot.history?.["1y"]?.summary.changePct ?? null;
  let trend: { label: string; tone: Tone } | null = null;
  if (ch30 !== null && ch90 !== null && ch1y !== null) {
    if (ch30 > 0 && ch90 > 0 && ch1y > 0) trend = { label: "Trending up", tone: "mint" };
    else if (ch30 < 0 && ch90 < 0 && ch1y < 0) trend = { label: "Trending down", tone: "rose" };
  }

  const psa10 = findGrade(snapshot, "psa", "10");
  const bgs10 = findGrade(snapshot, "bgs", "10");
  let arb: string | null = null;
  if (psa10?.market.amount && bgs10?.market.amount) {
    const diff = ((bgs10.market.amount - psa10.market.amount) / psa10.market.amount) * 100;
    if (Math.abs(diff) >= 8) arb = `BGS 10 ${diff > 0 ? "+" : ""}${diff.toFixed(0)}% vs PSA 10`;
  }

  const endingSoon = (listings ?? []).filter(
    (l) => l.isAuction && l.timeLeftSeconds != null && l.timeLeftSeconds < 86_400,
  ).length;

  const hasAny =
    hi !== null || lo !== null || offHighPct !== null || trend || arb || endingSoon > 0 || snapshot.tiersTotal > 0;
  if (!hasAny) return null;

  return (
    <div className={styles.chips}>
      {hi !== null && (
        <Chip icon={<TrendingUp size={12} />} tone="mint" label={`52w high ${usd(hi)}${hiAgo ? ` · ${hiAgo}` : ""}`} />
      )}
      {lo !== null && (
        <Chip icon={<TrendingDown size={12} />} tone="rose" label={`52w low ${usd(lo)}${loAgo ? ` · ${loAgo}` : ""}`} />
      )}
      {offHighPct !== null && offHighPct < -1 && (
        <Chip tone="amber" label={`${offHighPct.toFixed(1)}% off high`} />
      )}
      {trend && (
        <Chip
          icon={trend.tone === "mint" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          tone={trend.tone}
          label={trend.label}
        />
      )}
      {arb && <Chip icon={<Flame size={12} />} tone="amber" label={arb} />}
      {endingSoon > 0 && (
        <Chip icon={<Gavel size={12} />} tone="amber" label={`${endingSoon} auction${endingSoon > 1 ? "s" : ""} ending <24h`} />
      )}
      {snapshot.tiersTotal > 0 && (
        <Chip icon={<Clock size={12} />} label={`${snapshot.tiersTotal} priced tiers`} />
      )}
    </div>
  );
}

/* ── 3. Cost-basis strip (owned card P/L) ───────────────────────────── */

export function CostBasisStrip({
  cardId,
  marketAmount,
}: {
  cardId: string;
  marketAmount: Money | null | undefined;
}) {
  const { data: grades } = useGrades(undefined, true);
  const owned = useMemo(
    () => (grades ?? []).find((g) => g.cardId === cardId && g.purchasePriceUsd != null),
    [grades, cardId],
  );

  const cost = owned?.purchasePriceUsd ?? null;
  const current = marketAmount?.amount ?? null;
  if (!owned || cost === null || current === null) return null;

  const pnl = current - cost;
  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
  const positive = pnl >= 0;

  return (
    <div className={cx(styles.pnl, positive ? styles["tone-mint"] : styles["tone-rose"])}>
      <span className={styles.pnl__icon}>
        {positive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
      </span>
      <div className={styles.pnl__body}>
        <span className={styles.pnl__label}>Your P/L</span>
        <div className={styles.pnl__row}>
          <span className={styles.pnl__value}>
            {positive ? "+" : "−"}
            {formatMoney({ amount: Math.abs(pnl), currency: marketAmount?.currency ?? "USD" })}
          </span>
          <span className={styles.pnl__pct}>
            ({positive ? "+" : ""}
            {pnlPct.toFixed(1)}%)
          </span>
        </div>
        <span className={styles.pnl__sub}>
          Cost {formatMoney({ amount: cost, currency: "USD" })} · Now{" "}
          {formatMoney({ amount: current, currency: marketAmount?.currency ?? "USD" })}
        </span>
      </div>
    </div>
  );
}
