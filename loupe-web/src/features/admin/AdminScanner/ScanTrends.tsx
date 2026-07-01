import { useMemo } from "react";
import { Target, Timer, Zap } from "lucide-react";
import type { ScannerTrendPoint } from "@loupe/core";
import { Panel } from "@/components";
import styles from "./ScanTrends.module.scss";

/** One plotted line: how to pull its value from a day (null = gap/no data). */
interface Series {
  label: string;
  color: string;
  value: (p: ScannerTrendPoint) => number | null;
}

const W = 320;
const H = 128;
const PAD = { t: 10, r: 8, b: 16, l: 8 };

/**
 * Small multi-line trend chart (pure SVG). Days with no scans are gaps, not
 * dips to zero, so accuracy/latency read honestly. Volume is a faint bar behind.
 */
function MiniTrend({
  points,
  series,
  fmt,
  maxHint,
}: {
  points: ScannerTrendPoint[];
  series: Series[];
  fmt: (v: number) => string;
  maxHint?: number;
}) {
  const { paths, lasts, bars, maxCount } = useMemo(() => {
    const n = points.length;
    const xs = (i: number) =>
      PAD.l + (n <= 1 ? 0 : (i / (n - 1)) * (W - PAD.l - PAD.r));
    const allVals = series.flatMap((s) =>
      points.map(s.value).filter((v): v is number => v != null),
    );
    const rawMax = Math.max(maxHint ?? 0, ...(allVals.length ? allVals : [1]));
    const max = rawMax <= 0 ? 1 : rawMax * 1.1;
    const ys = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);

    const paths = series.map((s) => {
      let d = "";
      let pen = false;
      points.forEach((p, i) => {
        const v = s.value(p);
        if (v == null) {
          pen = false;
          return;
        }
        d += `${pen ? "L" : "M"}${xs(i).toFixed(1)} ${ys(v).toFixed(1)} `;
        pen = true;
      });
      return { d: d.trim(), color: s.color };
    });

    const lasts = series.map((s) => {
      for (let i = points.length - 1; i >= 0; i--) {
        const v = s.value(points[i]!);
        if (v != null) return { color: s.color, label: s.label, value: fmt(v) };
      }
      return { color: s.color, label: s.label, value: "—" };
    });

    const maxCount = Math.max(1, ...points.map((p) => p.count));
    const bw = n <= 1 ? W : (W - PAD.l - PAD.r) / n;
    const bars = points.map((p, i) => ({
      x: xs(i) - bw * 0.35,
      w: Math.max(1, bw * 0.7),
      h: (p.count / maxCount) * (H - PAD.t - PAD.b),
    }));

    return { paths, max, lasts, bars, maxCount };
  }, [points, series, fmt, maxHint]);

  const hasData = points.some((p) => p.count > 0);

  return (
    <div className={styles.chart}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} preserveAspectRatio="none">
        {/* baseline */}
        <line
          x1={PAD.l}
          x2={W - PAD.r}
          y1={H - PAD.b}
          y2={H - PAD.b}
          className={styles.axis}
        />
        {/* volume bars (faint) */}
        {maxCount > 0 &&
          bars.map((b, i) => (
            <rect
              key={i}
              x={b.x}
              y={H - PAD.b - b.h}
              width={b.w}
              height={b.h}
              className={styles.bar}
            />
          ))}
        {/* series lines */}
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill="none" stroke={p.color} className={styles.line} />
        ))}
      </svg>
      <div className={styles.legend}>
        {lasts.map((l, i) => (
          <span key={i} className={styles.legendItem}>
            <span className={styles.dot} style={{ background: l.color }} />
            {l.label} <strong>{hasData ? l.value : "—"}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Speed + accuracy over time — the two charts asked for. */
export function ScanTrends({ points }: { points: ScannerTrendPoint[] }) {
  return (
    <div className={styles.grid}>
      <Panel padding="lg" raised>
        <h2 className={styles.title}>
          <Target size={15} /> Accuracy over time
        </h2>
        <p className={styles.sub}>Mean match confidence &amp; free fast-path share, per day</p>
        <MiniTrend
          points={points}
          maxHint={1}
          fmt={(v) => `${Math.round(v * 100)}%`}
          series={[
            {
              label: "Confidence",
              color: "var(--accent-mint)",
              value: (p) => (p.count ? p.meanConfidence : null),
            },
            {
              label: "Fast-path",
              color: "var(--accent-blue, #4c8dff)",
              value: (p) => (p.count ? p.fastPathRate : null),
            },
          ]}
        />
      </Panel>

      <Panel padding="lg" raised>
        <h2 className={styles.title}>
          <Timer size={15} /> Speed over time
        </h2>
        <p className={styles.sub}>Identify latency per day (lower is faster)</p>
        <MiniTrend
          points={points}
          fmt={(v) => `${Math.round(v)} ms`}
          series={[
            {
              label: "p50",
              color: "var(--accent-mint)",
              value: (p) => (p.count ? p.latencyP50Ms : null),
            },
            {
              label: "p95",
              color: "var(--accent-amber, #ffb020)",
              value: (p) => (p.count ? p.latencyP95Ms : null),
            },
          ]}
        />
      </Panel>

      <Panel padding="lg" raised className={styles.wide}>
        <h2 className={styles.title}>
          <Zap size={15} /> Scan volume
        </h2>
        <p className={styles.sub}>Identifications per day</p>
        <MiniTrend
          points={points}
          fmt={(v) => v.toLocaleString()}
          series={[
            {
              label: "Identifications",
              color: "var(--accent-purple, #a879ff)",
              value: (p) => p.count,
            },
          ]}
        />
      </Panel>
    </div>
  );
}
