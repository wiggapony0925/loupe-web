/**
 * Pure chart geometry (no React, no DOM) — the loupe `@loupe/chart` idea:
 * math that is unit-testable and rendering-agnostic. The SVG component just
 * draws what this returns.
 *
 * The line is a monotone cubic (Fritsch–Carlson) — smooth like every modern
 * finance chart, but guaranteed never to overshoot a data point, which
 * matters when the data is someone's net worth.
 */
export interface SeriesPoint {
  t: number; // epoch ms
  v: number; // cents
}

export interface ChartGeometry {
  linePath: string;
  areaPath: string;
  baselineY: number | null;
  points: Array<{ x: number; y: number; t: number; v: number }>;
  min: number;
  max: number;
  trend: 'up' | 'down' | 'flat';
  /** Dashed gridline levels (top/bottom of the range) with label values. */
  ticks: Array<{ y: number; valueCents: number }>;
}

interface XY {
  x: number;
  y: number;
}

/** Monotone cubic interpolation path (Fritsch–Carlson tangents). */
export function monotonePath(points: XY[]): string {
  const n = points.length;
  if (n === 0) return '';
  const first = points[0]!;
  if (n === 1) return `M${first.x.toFixed(2)},${first.y.toFixed(2)}`;

  const dx: number[] = [];
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i]!;
    const p1 = points[i + 1]!;
    const deltaX = p1.x - p0.x || 1e-6;
    dx.push(deltaX);
    slopes.push((p1.y - p0.y) / deltaX);
  }

  const tangents: number[] = [slopes[0]!];
  for (let i = 1; i < n - 1; i++) {
    const prev = slopes[i - 1]!;
    const next = slopes[i]!;
    tangents.push(prev * next <= 0 ? 0 : (prev + next) / 2);
  }
  tangents.push(slopes[n - 2]!);

  // Clamp tangents so the curve stays monotone between points (no overshoot).
  for (let i = 0; i < n - 1; i++) {
    const slope = slopes[i]!;
    if (slope === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i]! / slope;
    const b = tangents[i + 1]! / slope;
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      tangents[i] = tau * a * slope;
      tangents[i + 1] = tau * b * slope;
    }
  }

  let d = `M${first.x.toFixed(2)},${first.y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i]!;
    const p1 = points[i + 1]!;
    const third = dx[i]! / 3;
    d +=
      ` C${(p0.x + third).toFixed(2)},${(p0.y + tangents[i]! * third).toFixed(2)}` +
      ` ${(p1.x - third).toFixed(2)},${(p1.y - tangents[i + 1]! * third).toFixed(2)}` +
      ` ${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;
  }
  return d;
}

export function computeGeometry(
  series: SeriesPoint[],
  width: number,
  height: number,
  padY = 10,
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

  const linePath = monotonePath(points);
  const lastPoint = points[points.length - 1]!;
  const firstPoint = points[0]!;
  const areaPath = `${linePath} L${lastPoint.x.toFixed(2)},${height} L${firstPoint.x.toFixed(2)},${height} Z`;

  const baselineY = padY + (1 - (first.v - min) / spanV) * usableHeight;
  const delta = last.v - first.v;

  const yFor = (v: number): number => padY + (1 - (v - min) / spanV) * usableHeight;

  return {
    linePath,
    areaPath,
    baselineY,
    points,
    min,
    max,
    trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    ticks: [
      { y: yFor(max), valueCents: max },
      { y: yFor(min), valueCents: min },
    ],
  };
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
