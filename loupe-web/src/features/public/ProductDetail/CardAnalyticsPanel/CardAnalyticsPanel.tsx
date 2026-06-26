import { Activity } from "lucide-react";
import { useCardAnalytics } from "@loupe/core";
import { Panel, Delta } from "@/components";
import { formatCompactMoney, formatMoney } from "@/lib/format";
import styles from "./CardAnalyticsPanel.module.scss";

const MOMENTUM: Array<{ label: string; key: "momentum7d" | "momentum30d" | "momentum90d" | "momentum1y" }> = [
  { label: "7D", key: "momentum7d" },
  { label: "30D", key: "momentum30d" },
  { label: "90D", key: "momentum90d" },
  { label: "1Y", key: "momentum1y" },
];

const usd = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : formatMoney({ amount: n, currency: "USD" });

/**
 * Derived market analytics for a card — market cap, momentum, volatility,
 * grade premium, all-time high/low, and liquidity. Composed server-side
 * (`/cards/:id/analytics`) so every surface shows identical figures. Renders
 * nothing until the endpoint returns data, so it degrades cleanly.
 */
export function CardAnalyticsPanel({ cardId }: { cardId: string }) {
  const { data } = useCardAnalytics(cardId);
  if (!data || data.marketPriceUsd == null) return null;

  const {
    marketCapUsd,
    population,
    volatilityPct,
    gradePremium,
    allTimeHighUsd,
    allTimeLowUsd,
    pctOffAth,
    liquidity30d,
  } = data;

  const hasMomentum = MOMENTUM.some((m) => data[m.key] != null);

  return (
    <section className={styles.root}>
      <header className={styles.head}>
        <h2 className={styles.title}>
          <Activity size={16} /> Market analytics
        </h2>
        <span className={styles.sub}>Derived from live market data</span>
      </header>

      {hasMomentum && (
        <Panel padding="lg" className={styles.momentum}>
          {MOMENTUM.map(({ label, key }) => {
            const v = data[key];
            return (
              <div key={key} className={styles.mom}>
                <span className={styles.mom__label}>{label}</span>
                <span className={styles.mom__value}>
                  {v != null ? <Delta percent={v} /> : "—"}
                </span>
              </div>
            );
          })}
        </Panel>
      )}

      <div className={styles.grid}>
        <Metric
          label="Market cap"
          value={marketCapUsd != null ? formatCompactMoney(marketCapUsd) : "—"}
          sub={population ? `${population.toLocaleString()} graded` : undefined}
        />
        <Metric
          label="Grade premium"
          value={gradePremium != null ? `${gradePremium.toFixed(1)}×` : "—"}
          sub="top grade vs raw"
        />
        <Metric
          label="Volatility"
          value={volatilityPct != null ? `${volatilityPct.toFixed(1)}%` : "—"}
          sub="90d"
          tone={volatilityPct != null && volatilityPct > 25 ? "amber" : undefined}
        />
        <Metric
          label="Liquidity"
          value={`${liquidity30d}`}
          sub="sales · 30d"
          tone={liquidity30d >= 10 ? "mint" : liquidity30d === 0 ? "rose" : undefined}
        />
        <Metric
          label="All-time high"
          value={usd(allTimeHighUsd)}
          sub={
            pctOffAth != null
              ? `${pctOffAth > 0 ? "+" : ""}${pctOffAth.toFixed(1)}% now`
              : undefined
          }
          tone={pctOffAth != null && pctOffAth < -1 ? "amber" : undefined}
        />
        <Metric label="All-time low" value={usd(allTimeLowUsd)} />
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "mint" | "rose" | "amber";
}) {
  return (
    <div className={styles.metric}>
      <span className={styles.metric__label}>{label}</span>
      <span
        className={styles.metric__value}
        data-tone={tone ?? undefined}
      >
        {value}
      </span>
      {sub && <span className={styles.metric__sub}>{sub}</span>}
    </div>
  );
}
