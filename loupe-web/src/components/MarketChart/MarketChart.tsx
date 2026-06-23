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
import {
  computeAvailableRanges,
  computeChartGeometry,
  DAY,
  nearestIndexByT,
  normalizeSeries,
  RANGE_LABEL,
} from "@loupe/chart";
import type { ChartPoint, ChartSeries, RangeKey } from "@loupe/chart";
import { cx } from "@/lib/cx";
import { RangePills } from "./RangePills/RangePills";
import styles from "./MarketChart.module.scss";

// The chart math now lives in the framework-agnostic `@loupe/chart` package
// so the mobile app (react-native-svg) renders the *same* geometry. Re-export
// the shared types so existing `@/components/MarketChart` imports keep working.
export type { ChartPoint, ChartSeries, RangeKey };

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

const PALETTE = [
  "var(--accent-blue)",
  "var(--accent-purple, #8b5cf6)",
  "var(--accent-amber, #f59e0b)",
  "var(--accent-mint)",
];
// `right` reserves a gutter for the right-aligned value-axis labels so a full
// currency label (e.g. "$2,645.39") never clips the plot edge — see the
// `text-anchor: end` labels below.
const PAD = { top: 12, right: 58, bottom: 22 };

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

/**
 * Custom interactive financial chart — the reusable primitive behind every
 * price/market surface. Built on SVG + pointer events (no chart lib): crosshair
 * scrubbing, color-by-change, gridlines, axis labels, draw-in animation, multi-series.
 *
 * The geometry (path building, scales, range slicing) comes from the shared
 * `@loupe/chart` package; this file is just the web (SVG + pointer) renderer.
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
  const norm = useMemo<ChartSeries[]>(() => normalizeSeries(series), [series]);

  const availableRanges = useMemo(
    () => computeAvailableRanges({ normalized: norm, ranges, controlled }),
    [norm, ranges, controlled],
  );

  const effectiveRange: RangeKey = controlled
    ? range
    : ((availableRanges.includes(range)
        ? range
        : availableRanges[availableRanges.length - 1]) ?? "ALL");

  // Slice to range + compute domain/pixel geometry — all from the shared
  // `@loupe/chart` package, so mobile draws the exact same paths.
  const geo = useMemo(
    () =>
      computeChartGeometry({
        normalized: norm,
        effectiveRange,
        controlled,
        width,
        height,
        smoothing,
        padding: PAD,
        palette: PALETTE,
      }),
    [norm, effectiveRange, controlled, width, height, smoothing],
  );

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

  // Per-series values at the scrubbed point — powers the multi-line tooltip.
  const scrubT = active !== null ? primaryPts[active]?.t : undefined;
  const tipRows =
    active !== null && scrubT !== undefined
      ? geo.built
          .map((b) => {
            const j = nearestIndexByT(b.series.points, scrubT);
            return {
              label: b.series.label ?? b.series.id,
              color: b.color,
              v: b.series.points[j]?.v,
            };
          })
          .filter(
            (r): r is { label: string; color: string; v: number } =>
              r.v != null,
          )
      : [];
  // "Equilibrium": when the compared lines have converged to ~the same price,
  // collapse to a single green readout instead of N near-identical rows.
  const tipVals = tipRows.map((r) => r.v);
  const tipMax = tipVals.length ? Math.max(...tipVals) : 0;
  const tipMin = tipVals.length ? Math.min(...tipVals) : 0;
  const equilibrium =
    tipRows.length > 1 && tipMin > 0 && (tipMax - tipMin) / tipMax < 0.015;
  // Flip the tooltip to the other side near the right edge so it never clips.
  const tipLeft = crossX > geo.innerW * 0.6 ? crossX - 8 : crossX + 8;
  const tipAlignRight = crossX > geo.innerW * 0.6;

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
                  x={width - 6}
                  y={y + 3}
                  textAnchor="end"
                  className={styles.chart__axis}
                >
                  {format(v)}
                </text>
              </g>
            );
          })}

          {/* time axis ticks — anchor the first/last to the plot edges so they
              never hang off the left/right (middle ticks stay centered). */}
          {Array.from({ length: 4 }).map((_, i) => {
            const f = i / 3;
            const t = geo.tMin + (geo.tHi - geo.tMin) * f;
            const anchor = i === 0 ? "start" : i === 3 ? "end" : "middle";
            const x = i === 0 ? 0 : i === 3 ? geo.innerW : geo.innerW * f;
            return (
              <text
                key={`t-${i}`}
                x={x}
                y={height - 6}
                textAnchor={anchor}
                className={styles.chart__axis}
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

        {/* scrub readout — single price flag, or a multi-line tooltip when comparing */}
        {active !== null &&
          primary &&
          (isSingle ? (
            <div
              className={styles.chart__flag}
              style={{ left: Math.min(Math.max(crossX, 30), geo.innerW - 30) }}
            >
              {format(shownV)}
            </div>
          ) : (
            <div
              className={cx(
                styles.chart__tip,
                tipAlignRight && styles["chart__tip--right"],
              )}
              style={{ left: tipLeft }}
            >
              {scrubT !== undefined && (
                <div className={styles.chart__tipDate}>{fmtTime(scrubT)}</div>
              )}
              {equilibrium ? (
                <div className={styles.chart__tipRow}>
                  <span
                    className={styles.chart__tipDot}
                    style={{ background: "var(--up)" }}
                  />
                  <span className={styles.chart__tipLabel}>Equilibrium</span>
                  <span
                    className={styles.chart__tipVal}
                    style={{ color: "var(--up)" }}
                  >
                    {format((tipMax + tipMin) / 2)}
                  </span>
                </div>
              ) : (
                tipRows.map((r, i) => (
                  <div key={i} className={styles.chart__tipRow}>
                    <span
                      className={styles.chart__tipDot}
                      style={{ background: r.color }}
                    />
                    <span className={styles.chart__tipLabel}>{r.label}</span>
                    <span className={styles.chart__tipVal}>{format(r.v)}</span>
                  </div>
                ))
              )}
            </div>
          ))}
      </div>

      <RangePills
        ranges={availableRanges}
        active={effectiveRange}
        onChange={(r) => {
          if (!controlled) setRange(r);
          change?.(r);
        }}
      />

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
