import styles from "./DonutChart.module.scss";

export interface DonutDatum {
  label: string;
  value: number;
}

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
  const cleaned = data.filter((d) => d.value > 0);
  if (cleaned.length === 0) return null;

  let slices = cleaned;
  if (cleaned.length > maxSlices) {
    const head = cleaned.slice(0, maxSlices);
    const restVal = cleaned.slice(maxSlices).reduce((s, d) => s + d.value, 0);
    slices = [...head, { label: "Other", value: restVal }];
  }

  const total = slices.reduce((s, d) => s + d.value, 0) || 1;
  const stroke = Math.round(size * 0.12);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  let acc = 0;
  const segs = slices.map((d, i) => {
    const frac = d.value / total;
    const dash = frac * c;
    const seg = {
      label: d.label,
      value: d.value,
      pct: frac * 100,
      color: d.label === "Other" ? REST : TONES[i % TONES.length],
      dash,
      offset: -acc,
    };
    acc += dash;
    return seg;
  });

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
