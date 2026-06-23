import { buildDonut, type DonutDatum } from "@loupe/chart";
import styles from "./DonutChart.module.scss";

// Ring geometry now lives in the shared `@loupe/chart` package so the mobile
// DonutChart draws the same ring. Re-export the datum type for consumers.
export type { DonutDatum };

export interface DonutChartProps {
  data: DonutDatum[];
  format?: (n: number) => string;
  /** Big figure in the ring's center (e.g. the total). */
  centerValue?: string;
  /** Quiet label under the center figure. */
  centerLabel?: string;
  /** Slices beyond this are folded into an "Other" segment. */
  maxSlices?: number;
  /** SVG diameter in px. */
  size?: number;
  ariaLabel?: string;
  onSlice?: (index: number) => void;
}

const TONES = [
  "var(--accent-mint)",
  "var(--accent-blue)",
  "var(--accent-purple)",
  "var(--accent-amber)",
  "var(--accent-rose)",
];
const REST = "var(--line-strong)";

/**
 * A flat, theme-aware donut chart — an SVG ring (stroke-dash segments) with a
 * center total and a value/percent legend. No chart dependency, like the rest
 * of the chart kit. Folds the long tail into an "Other" slice so the ring stays
 * readable. Used for portfolio allocation (value by set).
 */
export function DonutChart({
  data,
  format = (n) => String(Math.round(n)),
  centerValue,
  centerLabel,
  maxSlices = 5,
  size = 168,
  ariaLabel,
  onSlice,
}: DonutChartProps) {
  const geo = buildDonut({ data, size, maxSlices });
  if (!geo) return null;

  const { stroke, radius: r, circumference: c } = geo;
  const segs = geo.segments.map((s) => ({
    ...s,
    color: s.isOther ? REST : TONES[s.colorIndex % TONES.length],
  }));

  return (
    <div className={styles.wrap}>
      <div className={styles.ring} role="img" aria-label={ariaLabel}>
        <svg viewBox={`0 0 ${size} ${size}`} className={styles.svg}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            className={styles.track}
            strokeWidth={stroke}
          />
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {segs.map((s, i) => (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={stroke}
                strokeDasharray={`${s.dash} ${c - s.dash}`}
                strokeDashoffset={s.offset}
                style={{ stroke: s.color, cursor: onSlice ? "pointer" : undefined }}
                onClick={onSlice ? () => onSlice(i) : undefined}
              />
            ))}
          </g>
        </svg>
        {(centerValue || centerLabel) && (
          <div className={styles.center}>
            {centerValue && <span className={styles.centerValue}>{centerValue}</span>}
            {centerLabel && <span className={styles.centerLabel}>{centerLabel}</span>}
          </div>
        )}
      </div>

      <ul className={styles.legend}>
        {segs.map((s, i) => (
          <li key={i} className={styles.legendItem}>
            <span className={styles.dot} style={{ background: s.color }} aria-hidden />
            <span className={styles.legendLabel}>{s.label}</span>
            <span className={styles.legendValue}>
              {format(s.value)}
              <span className={styles.legendPct}>{Math.round(s.pct)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
