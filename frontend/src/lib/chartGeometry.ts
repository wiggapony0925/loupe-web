/**
 * Pure chart geometry (no React, no DOM) — the loupe `@loupe/chart` idea:
 * math that is unit-testable and rendering-agnostic. The SVG component just
 * draws what this returns.
 */
export interface SeriesPoint {
  t: number; // epoch ms
  v: number; // cents
}

export interface ChartGeometry {
  path: string;
  baselineY: number | null;
  points: Array<{ x: number; y: number; t: number; v: number }>;
  min: number;
  max: number;
}

export function computeGeometry(
  series: SeriesPoint[],
  width: number,
  height: number,
  padY = 8,
): ChartGeometry | null {
  if (series.length < 2 || width <= 0 || height <= 0) return null;

  const first = series[0]!;
  const last = series[series.length - 1]!;
  let min = Infinity;
  let max = -Infinity;
  for (const point of series) {
    if (point.v < min) min = point.v;
    if (point.v > max) max = point.v;
  }
  // A flat series still needs vertical room to draw a visible line.
  if (min === max) {
    min -= 100;
    max += 100;
  }

  const spanT = Math.max(1, last.t - first.t);
  const spanV = max - min;
  const usableHeight = height - padY * 2;

  const points = series.map((point) => ({
    x: ((point.t - first.t) / spanT) * width,
    y: padY + (1 - (point.v - min) / spanV) * usableHeight,
    t: point.t,
    v: point.v,
  }));

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');

  const baselineY = padY + (1 - (first.v - min) / spanV) * usableHeight;

  return { path, baselineY, points, min, max };
}

/** Nearest data point to a pointer x — binary search, the scrubber calls this per move. */
export function nearestPointIndex(geometry: ChartGeometry, x: number): number {
  const points = geometry.points;
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((points[mid]?.x ?? 0) < x) lo = mid;
    else hi = mid;
  }
  const loDist = Math.abs((points[lo]?.x ?? 0) - x);
  const hiDist = Math.abs((points[hi]?.x ?? 0) - x);
  return loDist <= hiDist ? lo : hi;
}
