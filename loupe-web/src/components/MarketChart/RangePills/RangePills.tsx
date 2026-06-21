import { cx } from "@/lib/cx";
import styles from "./RangePills.module.scss";

interface RangePillsProps<T extends string> {
  ranges: readonly T[];
  active: T;
  onChange: (r: T) => void;
}

/**
 * The timeframe selector row (1W · 1M · 3M · 1Y · ALL) shared by the full
 * `MarketChart` and the loading/empty fallback in `CardPriceChart` — one source
 * of truth for the pill markup, a11y roles, and styling. The active tint reads
 * `--chart-accent` when rendered inside a chart (so it shifts green/red by
 * period change) and falls back to mint when used standalone.
 */
export function RangePills<T extends string>({
  ranges,
  active,
  onChange,
}: RangePillsProps<T>) {
  return (
    <div className={styles.pills} role="tablist" aria-label="Time range">
      {ranges.map((r) => (
        <button
          key={r}
          role="tab"
          aria-selected={r === active}
          className={cx(styles.pill, r === active && styles["pill--active"])}
          onClick={() => onChange(r)}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
