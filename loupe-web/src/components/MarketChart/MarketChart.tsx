import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cx } from "@/lib/cx";
import styles from "./MarketChart.module.scss";

export interface ChartPoint {
  /** Epoch ms. */
  t: number;
  v: number;
}

export interface ChartSeries {
  id: string;
  label?: string;
  /** CSS color; falls back to the dynamic accent / palette. */
  color?: string;
  points: ChartPoint[];
}

export type RangeKey = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

export interface MarketChartProps {
  series: ChartSeries[];
  height?: number;
  ranges?: RangeKey[];
  defaultRange?: RangeKey;
  /**
   * Controlled range. When provided, the chart renders the given `series`
   * as-is (no client-side slicing) and treats `ranges` as authoritative —
   * the host is fetching the correctly-grained series per range from the
   * backend (matching the mobile app). Omit for the self-slicing mode.
   */
  range?: RangeKey;
  /** Value formatter (money/percent). */
  format?: (v: number) => string;
  formatTime?: (t: number) => string;
  /** Single series: shift line/area green↔red by period change (Robinhood). */
  colorByChange?: boolean;
  /** Show the big value + delta + scrub readout header. */
  header?: boolean;
  title?: string;
  smoothing?: boolean;
  onRangeChange?: (r: RangeKey) => void;
}

const RANGE_DAYS: Record<RangeKey, number> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 182,
  "1Y": 365,
  ALL: Infinity,
};
/** Friendly resting subtitle per range (e.g. "Past week", "All time"). */
const RANGE_LABEL: Record<RangeKey, string> = {
  "1D": "Today",
  "1W": "Past week",
  "1M": "Past month",
  "3M": "Past 3 months",
  "6M": "Past 6 months",
  "1Y": "Past year",
  ALL: "All time",
};
const DAY = 86_400_000;
const PALETTE = [
  "var(--accent-blue)",
  "var(--accent-purple, #8b5cf6)",
  "var(--accent-amber, #f59e0b)",
  "var(--accent-mint)",
];
const PAD = { top: 12, right: 46, bottom: 22 };

/** Width of an element, measured on mount and tracked live via ResizeObserver. */
function useElementWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = useState(640);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Seed synchronously from the real layout width so the first paint is
    // correctly sized (don't wait for the async ResizeObserver, which can be
    // slow/flaky and otherwise leaves the chart at the 640 default on mobile).
    const measure = () => {
      const cw = el.clientWidth;
      if (cw) setW(cw);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

/** Catmull-Rom → cubic-bezier path for smooth, non-overshooting lines. */
function buildLine(
  pts: ReadonlyArray<readonly [number, number]>,
  smooth: boolean,
): string {
  if (pts.length === 0) return "";
  if (pts.length < 3 || !smooth)
    return pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
  const at = (i: number) => pts[Math.min(Math.max(i, 0), pts.length - 1)]!;
  let d = `M${at(0)[0]} ${at(0)[1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

function nearestIndexByT(pts: ChartPoint[], t: number) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i];
    if (!pt) continue;
    const d = Math.abs(pt.t - t);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/**
 * Custom interactive financial chart — the reusable primitive behind every
 * price/market surface. Built on SVG + pointer events (no chart lib): crosshair
 * scrubbing, color-by-change, gridlines, axis labels, draw-in animation, multi-series.
 */
export function MarketChart({
  series,
  height = 288,
  ranges = ["1W", "1M", "3M", "1Y", "ALL"],
  defaultRange,
  range: controlledRange,
  format = (v) => v.toLocaleString(undefined, { maximumFractionDigits: 2 }),
  formatTime,
  colorByChange = true,
  header = true,
  title,
  smoothing = true,
  onRangeChange,
}: MarketChartProps) {
  const gid = useId();
  const plotRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(plotRef);
  const controlled = controlledRange !== undefined;
  const [internalRange, setRange] = useState<RangeKey>(defaultRange ?? "1M");
  const range = controlled ? controlledRange : internalRange;
  const [active, setActive] = useState<number | null>(null);

  // Normalize: ensure finite, ascending timestamps (fall back to index spacing).
  const norm = useMemo<ChartSeries[]>(
    () =>
      series.map((s) => {
        const ok =
          s.points.length > 1 && s.points.every((p) => Number.isFinite(p.t));
        const pts = ok
          ? [...s.points].sort((a, b) => a.t - b.t)
          : s.points.map((p, i) => ({ t: i * DAY, v: p.v }));
        return { ...s, points: pts };
      }),
    [series],
  );

  const fullSpanDays = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of norm)
      for (const p of s.points) {
        if (p.t < lo) lo = p.t;
        if (p.t > hi) hi = p.t;
      }
    return hi > lo ? (hi - lo) / DAY : 0;
  }, [norm]);

  const availableRanges = useMemo(() => {
    // Controlled: the host owns the range set + data; show pills verbatim.
    if (controlled) return ranges.length ? ranges : (["ALL"] as RangeKey[]);
    const list = ranges.filter(
      (r) => r === "ALL" || RANGE_DAYS[r] < fullSpanDays * 0.98,
    );
    if (!list.includes("ALL")) list.push("ALL");
    return list.length ? list : (["ALL"] as RangeKey[]);
  }, [controlled, ranges, fullSpanDays]);

  const effectiveRange: RangeKey = controlled
    ? range
    : ((availableRanges.includes(range)
        ? range
        : availableRanges[availableRanges.length - 1]) ?? "ALL");

  // Slice to range, compute domain + pixel geometry.
  const geo = useMemo(() => {
    const innerW = Math.max(1, width - PAD.right);
    const innerH = Math.max(1, height - PAD.top - PAD.bottom);

    let tMax = -Infinity;
    for (const s of norm) for (const p of s.points) if (p.t > tMax) tMax = p.t;
    // Controlled mode: data is already the right window — never slice.
    const cutoff =
      controlled || effectiveRange === "ALL"
        ? -Infinity
        : tMax - RANGE_DAYS[effectiveRange] * DAY;

    const sliced = norm.map((s) => {
      let pts = s.points.filter((p) => p.t >= cutoff);
      if (pts.length < 2) pts = s.points.slice(-2);
      return { ...s, points: pts };
    });

    let tMin = Infinity;
    let tHi = -Infinity;
    let vMin = Infinity;
    let vMax = -Infinity;
    for (const s of sliced)
      for (const p of s.points) {
        if (p.t < tMin) tMin = p.t;
        if (p.t > tHi) tHi = p.t;
        if (p.v < vMin) vMin = p.v;
        if (p.v > vMax) vMax = p.v;
      }
    const vPad = (vMax - vMin || Math.abs(vMax) || 1) * 0.08;
    vMin -= vPad;
    vMax += vPad;
    const tSpan = tHi - tMin || 1;
    const vSpan = vMax - vMin || 1;

    const xOf = (t: number) => ((t - tMin) / tSpan) * innerW;
    const yOf = (v: number) => PAD.top + innerH * (1 - (v - vMin) / vSpan);

    const built = sliced.map((s, i) => {
      const coords = s.points.map((p) => [xOf(p.t), yOf(p.v)] as const);
      const line = buildLine(coords, smoothing);
      const last = coords[coords.length - 1] ?? [0, 0];
      const area = line
        ? `${line} L${last[0]} ${PAD.top + innerH} L${coords[0]?.[0] ?? 0} ${PAD.top + innerH} Z`
        : "";
      return {
        series: s,
        coords,
        line,
        area,
        color: s.color ?? PALETTE[i % PALETTE.length]!,
      };
    });

    return { built, innerW, innerH, vMin, vMax, tMin, tHi, xOf, yOf };
  }, [norm, effectiveRange, controlled, width, height, smoothing]);

  // Span-aware time formatter (used when the host doesn't pass one): a
  // multi-year ALL window shows years, a multi-month window shows "Mon 'YY",
  // and a short window shows "Mon D" — so axis labels are always accurate.
  const fmtTime = useMemo(() => {
    if (formatTime) return formatTime;
    const spanDays = (geo.tHi - geo.tMin) / DAY;
    if (spanDays > 730)
      return (t: number) =>
        new Date(t).toLocaleDateString(undefined, { year: "numeric" });
    if (spanDays > 75)
      return (t: number) =>
        new Date(t).toLocaleDateString(undefined, {
          month: "short",
          year: "2-digit",
        });
    return (t: number) =>
      new Date(t).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
  }, [formatTime, geo.tHi, geo.tMin]);

  const primary = geo.built[0];
  const primaryPts = primary?.series.points ?? [];
  const isSingle = norm.length === 1;
  const baseV = primaryPts[0]?.v ?? 0;
  const lastV = primaryPts[primaryPts.length - 1]?.v ?? 0;
  const positive = lastV >= baseV;

  // Dynamic accent (single series, color-by-change) → drives line + gradient.
  const accent =
    isSingle && colorByChange
      ? positive
        ? "var(--up)"
        : "var(--down)"
      : (primary?.color ?? PALETTE[0]!);

  // Re-trigger the draw-in animation when range changes.
  const drawKey = `${effectiveRange}-${Math.round(width)}`;

  // Reset scrub when range/data changes.
  useEffect(() => setActive(null), [effectiveRange, width]);

  const idx = active ?? primaryPts.length - 1;
  const shownV = primaryPts[idx]?.v ?? lastV;
  const shownT = primaryPts[idx]?.t;
  const delta = shownV - baseV;
  const deltaPct = baseV ? (delta / baseV) * 100 : 0;
  const deltaUp = delta >= 0;

  function handleMove(e: ReactPointerEvent) {
    const el = plotRef.current;
    if (!el || !primary) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < primary.coords.length; i++) {
      const c = primary.coords[i];
      if (!c) continue;
      const d = Math.abs(c[0] - x);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    setActive(best);
  }

  const crossX =
    active !== null && primary ? (primary.coords[active]?.[0] ?? 0) : 0;
  const yTicks = 4;
  const change = onRangeChange;

  return (
    <div
      className={styles.chart}
      style={{ "--chart-accent": accent } as CSSProperties}
    >
      {header && (
        <div className={styles.chart__head}>
          <div>
            {title && <span className={styles.chart__title}>{title}</span>}
            <div className={styles.chart__value}>{format(shownV)}</div>
          </div>
          <div className={styles.chart__metric}>
            <span
              className={cx(
                styles.chart__delta,
                !deltaUp && styles["chart__delta--down"],
              )}
            >
              {deltaUp ? "▲" : "▼"} {format(Math.abs(delta))} (
              {deltaPct >= 0 ? "+" : ""}
              {deltaPct.toFixed(2)}%)
            </span>
            <span className={styles.chart__period}>
              {active !== null && shownT !== undefined
                ? fmtTime(shownT)
                : RANGE_LABEL[effectiveRange]}
            </span>
          </div>
        </div>
      )}

      <div
        ref={plotRef}
        className={styles.chart__plot}
        style={{ height }}
        onPointerMove={handleMove}
        onPointerDown={handleMove}
        onPointerLeave={() => setActive(null)}
      >
        <svg
          className={styles.chart__svg}
          width={width}
          height={height}
          role="img"
          aria-label={title ?? "Price chart"}
        >
          <defs>
            {geo.built.map((b, i) => (
              <linearGradient
                key={i}
                id={`${gid}-grad-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={isSingle ? "var(--chart-accent)" : b.color}
                  stopOpacity="0.28"
                />
                <stop
                  offset="100%"
                  stopColor={isSingle ? "var(--chart-accent)" : b.color}
                  stopOpacity="0"
                />
              </linearGradient>
            ))}
          </defs>

          {/* horizontal gridlines + value axis (Yahoo/Webull-style) */}
          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const y = PAD.top + (geo.innerH * i) / yTicks;
            const v = geo.vMax - ((geo.vMax - geo.vMin) * i) / yTicks;
            return (
              <g key={`grid-${i}`}>
                <line
                  x1={0}
                  y1={y}
                  x2={geo.innerW}
                  y2={y}
                  className={styles.chart__grid}
                />
                <text
                  x={width - PAD.right + 6}
                  y={y + 3}
                  className={styles.chart__axis}
                >
                  {format(v)}
                </text>
              </g>
            );
          })}

          {/* time axis ticks */}
          {Array.from({ length: 4 }).map((_, i) => {
            const f = i / 3;
            const x = geo.innerW * f;
            const t = geo.tMin + (geo.tHi - geo.tMin) * f;
            return (
              <text
                key={`t-${i}`}
                x={Math.min(Math.max(x, 16), geo.innerW - 16)}
                y={height - 6}
                className={cx(styles.chart__axis, styles["chart__axis--time"])}
              >
                {fmtTime(t)}
              </text>
            );
          })}

          <g key={drawKey} className={styles.chart__draw}>
            {geo.built.map((b, i) => (
              <path
                key={`area-${i}`}
                d={b.area}
                className={styles.chart__area}
                fill={`url(#${gid}-grad-${i})`}
              />
            ))}
            {geo.built.map((b, i) => (
              <path
                key={`line-${i}`}
                d={b.line}
                className={styles.chart__line}
                stroke={isSingle ? "var(--chart-accent)" : b.color}
                pathLength={1}
              />
            ))}
          </g>

          {/* crosshair + dots */}
          {active !== null && primary && (
            <g className={styles.chart__cross}>
              <line
                x1={crossX}
                y1={PAD.top}
                x2={crossX}
                y2={PAD.top + geo.innerH}
                className={styles.chart__crossline}
              />
              {geo.built.map((b, i) => {
                const j = nearestIndexByT(
                  b.series.points,
                  primaryPts[active]?.t ?? 0,
                );
                const c = b.coords[j];
                if (!c) return null;
                return (
                  <circle
                    key={`dot-${i}`}
                    cx={c[0]}
                    cy={c[1]}
                    r={4.5}
                    className={styles.chart__dot}
                    stroke={isSingle ? "var(--chart-accent)" : b.color}
                  />
                );
              })}
            </g>
          )}
        </svg>

        {/* scrub value flag */}
        {active !== null && primary && (
          <div
            className={styles.chart__flag}
            style={{ left: Math.min(Math.max(crossX, 30), geo.innerW - 30) }}
          >
            {format(shownV)}
          </div>
        )}
      </div>

      <div
        className={styles.chart__ranges}
        role="tablist"
        aria-label="Time range"
      >
        {availableRanges.map((r) => (
          <button
            key={r}
            role="tab"
            aria-selected={r === effectiveRange}
            className={cx(
              styles.chart__range,
              r === effectiveRange && styles["chart__range--active"],
            )}
            onClick={() => {
              if (!controlled) setRange(r);
              change?.(r);
            }}
          >
            {r}
          </button>
        ))}
      </div>

      {norm.length > 1 && (
        <div className={styles.chart__legend}>
          {geo.built.map((b, i) => (
            <span key={i} className={styles["chart__legend-item"]}>
              <span
                className={styles["chart__legend-swatch"]}
                style={{ background: b.color }}
              />
              {b.series.label ?? b.series.id}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
