import { useState } from "react";
import { buildBars, BAR_GRID, type BarDatum } from "@loupe/chart";
import { cx } from "@/lib/cx";
import styles from "./BarChart.module.scss";

// Bar geometry (max/fraction/highlight) is shared via `@loupe/chart`; the
// mobile bar charts use the same math. Re-export the datum type for consumers.
export type { BarDatum };

export interface BarChartProps {
  data: BarDatum[];
  /** Format a value for the live readout / tooltips. */
  format?: (n: number) => string;
  /** Which bar is highlighted at rest; defaults to the tallest. */
  highlightIndex?: number;
  /** Plot height in px. */
  height?: number;
  /** Quiet context figure shown beside the readout (e.g. the running total). */
  backdrop?: string;
  ariaLabel?: string;
  onBar?: (index: number) => void;
}

/**
 * A flat, interactive bar chart — hover (or focus) any bar to drive a live
 * label + value readout and highlight that column, exactly the way MarketChart
 * scrubs a line. Gridlines + a baseline give it structure so a single bar never
 * reads as empty. Pure markup, no chart dependency. Reused for grade
 * distribution, value-by-decade, and value-by-set.
 */
export function BarChart({
  data,
  format = (n) => String(Math.round(n)),
  highlightIndex,
  height = 200,
  backdrop,
  ariaLabel,
  onBar,
}: BarChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return null;

  const { bars, highlight } = buildBars({ data, highlightIndex });
  const active = hover ?? highlight;
  const current = data[active] ?? data[0]!;

  return (
    <div className={styles.wrap} role="img" aria-label={ariaLabel}>
      <div className={styles.readout}>
        <div className={styles.readoutMain}>
          <span className={styles.readoutLabel}>{current.label}</span>
          <span className={styles.readoutValue}>{format(current.value)}</span>
        </div>
        {backdrop && <span className={styles.readoutTotal}>{backdrop} total</span>}
      </div>

      <div
        className={styles.plot}
        style={{ "--plot-h": `${height}px` } as React.CSSProperties}
        onPointerLeave={() => setHover(null)}
      >
        <div className={styles.grid} aria-hidden>
          {BAR_GRID.map((g) => (
            <span key={g} className={styles.gridLine} style={{ top: `${g * 100}%` }} />
          ))}
        </div>

        {bars.map((d, i) => {
          const pct = Math.max(2, d.fraction * 100);
          const on = i === active;
          const Tag = onBar ? "button" : "div";
          return (
            <Tag
              key={`${d.label}-${i}`}
              type={onBar ? "button" : undefined}
              className={styles.col}
              aria-label={`${d.label}: ${format(d.value)}`}
              onPointerEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={onBar ? () => onBar(i) : undefined}
            >
              <span className={styles.barArea}>
                <span
                  className={cx(styles.bar, on && styles.barOn)}
                  style={{ height: `${pct}%` }}
                />
              </span>
              <span className={cx(styles.x, on && styles.xOn)} title={d.label}>
                {d.label}
              </span>
            </Tag>
          );
        })}
      </div>
    </div>
  );
}
