/**
 * NetWorthChart — the hero chart, modern edition: monotone-cubic line with a
 * gradient area fill, colored by trend (green up / red down — the delta text
 * beside it always carries the sign, so color never works alone), an
 * animated draw-in per range change, a pulsing live endpoint, and a
 * crosshair scrubber with a floating date/value tooltip and haptic ticks.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { computeGeometry, nearestPointIndex, type SeriesPoint } from '@/lib/chartGeometry';
import { useHaptics } from '@/hooks/useHaptics';
import { chartDate, money, moneyCompact } from '@/lib/format';
import type { NetWorthRange } from '@/types/types';

const RANGES: NetWorthRange[] = ['1W', '1M', '3M', 'YTD', '1Y', 'ALL'];
const CHART_HEIGHT = 200;

const tooltipDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export interface NetWorthChartProps {
  points: Array<{ t: string; netWorthCents: number }>;
  range: NetWorthRange;
  onRangeChange: (range: NetWorthRange) => void;
  onScrub: (point: { t: number; v: number } | null) => void;
}

export function NetWorthChart({ points, range, onRangeChange, onScrub }: NetWorthChartProps) {
  const haptics = useHaptics();
  const gradientId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const [width, setWidth] = useState(0);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const lastIndex = useRef<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const series: SeriesPoint[] = useMemo(
    () => points.map((p) => ({ t: new Date(p.t).getTime(), v: p.netWorthCents })),
    [points],
  );

  const geometry = useMemo(() => computeGeometry(series, width, CHART_HEIGHT), [series, width]);

  // Draw-in: dash the line to its own length and release. Re-runs when the
  // range (or data identity) changes; collapses under reduced motion.
  const drawKey = `${range}:${series.length}:${width}`;
  useEffect(() => {
    const path = lineRef.current;
    if (!path || !geometry) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const length = path.getTotalLength();
    path.style.transition = 'none';
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
    path.getBoundingClientRect(); // flush so the transition actually animates
    path.style.transition = 'stroke-dashoffset 640ms cubic-bezier(0.16, 1, 0.3, 1)';
    path.style.strokeDashoffset = '0';
    const timer = window.setTimeout(() => {
      // Clear the dash so the scrub crosshair never reveals a dashed line.
      path.style.strokeDasharray = 'none';
    }, 700);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawKey, geometry === null]);

  const handleScrub = (clientX: number): void => {
    if (!geometry || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const index = nearestPointIndex(geometry, clientX - rect.left);
    if (index !== lastIndex.current) {
      lastIndex.current = index;
      haptics.impactLight();
    }
    setScrubIndex(index);
    const point = geometry.points[index];
    if (point) onScrub({ t: point.t, v: point.v });
  };

  const endScrub = (): void => {
    lastIndex.current = null;
    setScrubIndex(null);
    onScrub(null);
  };

  const scrubPoint = scrubIndex !== null && geometry ? geometry.points[scrubIndex] : undefined;
  const endPoint = geometry ? geometry.points[geometry.points.length - 1] : undefined;
  const trendClass = geometry ? ` net-worth-chart--${geometry.trend}` : '';

  // Keep the floating tooltip inside the plot edges.
  const tooltipLeft = scrubPoint ? Math.min(Math.max(scrubPoint.x, 56), Math.max(width - 56, 56)) : 0;

  return (
    <div className={`net-worth-chart${trendClass}${scrubPoint ? ' net-worth-chart--scrubbing' : ''}`}>
      <div
        ref={wrapRef}
        className="net-worth-chart__plot"
        onPointerDown={(e) => handleScrub(e.clientX)}
        onPointerMove={(e) => {
          if (e.buttons > 0 || e.pointerType === 'touch') handleScrub(e.clientX);
        }}
        onPointerUp={endScrub}
        onPointerLeave={endScrub}
        onPointerCancel={endScrub}
      >
        {geometry ? (
          <>
            <svg
              className="net-worth-chart__svg"
              width={width}
              height={CHART_HEIGHT}
              viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
              role="img"
              aria-label={`Net worth over ${range}`}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop className="net-worth-chart__grad-top" offset="0%" />
                  <stop className="net-worth-chart__grad-bottom" offset="100%" />
                </linearGradient>
              </defs>
              {geometry.ticks.map((tick, index) => (
                <g key={tick.valueCents}>
                  <line className="net-worth-chart__grid" x1={0} x2={width} y1={tick.y} y2={tick.y} />
                  <text
                    className="net-worth-chart__grid-label"
                    x={index === 0 ? 8 : width - 8}
                    y={tick.y - 5}
                    textAnchor={index === 0 ? 'start' : 'end'}
                  >
                    {moneyCompact(tick.valueCents)}
                  </text>
                </g>
              ))}
              {geometry.baselineY !== null ? (
                <line
                  className="net-worth-chart__baseline"
                  x1={0}
                  x2={width}
                  y1={geometry.baselineY}
                  y2={geometry.baselineY}
                />
              ) : null}
              <path
                key={`area-${drawKey}`}
                className="net-worth-chart__area"
                d={geometry.areaPath}
                fill={`url(#${gradientId})`}
              />
              <path
                key={`line-${drawKey}`}
                ref={lineRef}
                className="net-worth-chart__line"
                d={geometry.linePath}
              />
              {endPoint && !scrubPoint ? (
                <g className="net-worth-chart__live">
                  <circle className="net-worth-chart__live-ring" cx={endPoint.x} cy={endPoint.y} r={5} />
                  <circle className="net-worth-chart__live-dot" cx={endPoint.x} cy={endPoint.y} r={4} />
                </g>
              ) : null}
              {scrubPoint ? (
                <g>
                  <line
                    className="net-worth-chart__crosshair"
                    x1={scrubPoint.x}
                    x2={scrubPoint.x}
                    y1={0}
                    y2={CHART_HEIGHT}
                  />
                  <circle className="net-worth-chart__dot" cx={scrubPoint.x} cy={scrubPoint.y} r={5.5} />
                </g>
              ) : null}
            </svg>
            {scrubPoint ? (
              <div className="net-worth-chart__tooltip" style={{ left: tooltipLeft }}>
                <span className="net-worth-chart__tooltip-value">{money(scrubPoint.v)}</span>
                <span className="net-worth-chart__tooltip-date">{tooltipDate.format(scrubPoint.t)}</span>
              </div>
            ) : null}
          </>
        ) : (
          <div className="net-worth-chart__empty">
            Link an account — your chart starts with your first snapshot.
          </div>
        )}
      </div>

      {geometry ? (
        <div className="net-worth-chart__dates" aria-hidden="true">
          <span>{chartDate(geometry.points[0]?.t ?? Date.now())}</span>
          <span>{chartDate(geometry.points[geometry.points.length - 1]?.t ?? Date.now())}</span>
        </div>
      ) : null}

      <div className="net-worth-chart__ranges" role="tablist" aria-label="Time range">
        {RANGES.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={option === range}
            className={`net-worth-chart__range${option === range ? ' net-worth-chart__range--active' : ''}`}
            onClick={() => {
              haptics.impactLight();
              onRangeChange(option);
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
