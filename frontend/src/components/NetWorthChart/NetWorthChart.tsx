/**
 * NetWorthChart — the loupe-style hero chart: single monochrome 2px line,
 * no grid noise, dashed period-start baseline, crosshair scrub with haptic
 * ticks, and range pills. Scrubbing reports the hovered point upward so the
 * hero number above the chart live-updates (the value is always readable as
 * text — identity never rides on color).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { computeGeometry, nearestPointIndex, type SeriesPoint } from '@/lib/chartGeometry';
import { useHaptics } from '@/hooks/useHaptics';
import type { NetWorthRange } from '@/types/types';

const RANGES: NetWorthRange[] = ['1W', '1M', '3M', 'YTD', '1Y', 'ALL'];
const CHART_HEIGHT = 180;

export interface NetWorthChartProps {
  points: Array<{ t: string; netWorthCents: number }>;
  range: NetWorthRange;
  onRangeChange: (range: NetWorthRange) => void;
  onScrub: (point: { t: number; v: number } | null) => void;
}

export function NetWorthChart({ points, range, onRangeChange, onScrub }: NetWorthChartProps) {
  const haptics = useHaptics();
  const wrapRef = useRef<HTMLDivElement>(null);
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

  const geometry = useMemo(
    () => computeGeometry(series, width, CHART_HEIGHT),
    [series, width],
  );

  const handleScrub = (clientX: number): void => {
    if (!geometry || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const index = nearestPointIndex(geometry, clientX - rect.left);
    if (index !== lastIndex.current) {
      lastIndex.current = index;
      haptics.impactLight(); // tick as the crosshair jumps points
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

  return (
    <div className="net-worth-chart">
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
          <svg
            className="net-worth-chart__svg"
            width={width}
            height={CHART_HEIGHT}
            viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
            role="img"
            aria-label={`Net worth over ${range}`}
          >
            {geometry.baselineY !== null ? (
              <line
                className="net-worth-chart__baseline"
                x1={0}
                x2={width}
                y1={geometry.baselineY}
                y2={geometry.baselineY}
              />
            ) : null}
            <path className="net-worth-chart__line" d={geometry.path} />
            {scrubPoint ? (
              <g>
                <line
                  className="net-worth-chart__crosshair"
                  x1={scrubPoint.x}
                  x2={scrubPoint.x}
                  y1={0}
                  y2={CHART_HEIGHT}
                />
                <circle className="net-worth-chart__dot" cx={scrubPoint.x} cy={scrubPoint.y} r={5} />
              </g>
            ) : null}
          </svg>
        ) : (
          <div className="net-worth-chart__empty">
            Link an account — your chart starts with your first snapshot.
          </div>
        )}
      </div>

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
