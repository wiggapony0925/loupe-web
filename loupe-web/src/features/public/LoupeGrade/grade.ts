/**
 * Loupe Grade rubric — a transparent, photo-based pre-screen estimate.
 *
 * This is NOT an official grade. It mirrors the public PSA centering
 * tolerances and a simple sub-grade blend so a collector can sanity-check a
 * raw card (or an eBay listing photo) before paying to grade it. Every number
 * here is explainable on screen — no black box.
 */

/** A frame in normalized [0,1] coords relative to the image box. */
export interface Frame {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Centering {
  /** Horizontal split as the larger side %, e.g. 53 means 53/47. */
  hLarger: number;
  vLarger: number;
  hLabel: string; // "53 / 47"
  vLabel: string;
  /** Centering sub-grade 1–10 (the worse axis governs). */
  grade: number;
}

/**
 * PSA front-centering tolerance → the best grade that split can earn.
 * Keyed by the *larger* side percentage. (Reverse/back is looser; we estimate
 * on the stricter front number, which is what a single listing photo shows.)
 */
const CENTERING_LADDER: Array<[maxLargerPct: number, grade: number]> = [
  [55, 10],
  [60, 9],
  [65, 8],
  [70, 7],
  [75, 6],
  [80, 5],
  [85, 4],
  [90, 3],
];

function centeringGrade(largerPct: number): number {
  for (const [max, grade] of CENTERING_LADDER) if (largerPct <= max) return grade;
  return 2;
}

/**
 * Centering from an outer (card edge) + inner (print border) frame. The four
 * border widths give the L/R and T/B splits, exactly how PSA measures it.
 */
export function measureCentering(outer: Frame, inner: Frame): Centering | null {
  const leftB = inner.left - outer.left;
  const rightB = outer.right - inner.right;
  const topB = inner.top - outer.top;
  const botB = outer.bottom - inner.bottom;
  // Inner must sit inside outer with positive borders, or the marks are invalid.
  if (leftB < 0 || rightB < 0 || topB < 0 || botB < 0) return null;
  const hSum = leftB + rightB;
  const vSum = topB + botB;
  if (hSum <= 0 || vSum <= 0) return null;

  const hLeftPct = (leftB / hSum) * 100;
  const vTopPct = (topB / vSum) * 100;
  const hLarger = Math.max(hLeftPct, 100 - hLeftPct);
  const vLarger = Math.max(vTopPct, 100 - vTopPct);

  const r = (n: number) => Math.round(n);
  return {
    hLarger,
    vLarger,
    hLabel: `${r(hLeftPct)} / ${r(100 - hLeftPct)}`,
    vLabel: `${r(vTopPct)} / ${r(100 - vTopPct)}`,
    grade: Math.min(centeringGrade(hLarger), centeringGrade(vLarger)),
  };
}

export interface SubGrades {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
}

export interface LoupeGradeResult {
  /** Point estimate 1–10 (half-point resolution). */
  estimate: number;
  /** Conservative band the card is likely to fall in, e.g. "PSA 8–9". */
  band: string;
  /** Plain-English read of the estimate. */
  verdict: string;
  subs: SubGrades;
}

/**
 * Blend the four sub-grades into an overall estimate. Weighted toward
 * centering + corners (what graders punish hardest), then capped so a single
 * weak sub-grade can't be hidden by strong ones — the way real grading works.
 */
export function loupeGrade(subs: SubGrades): LoupeGradeResult {
  const weighted =
    subs.centering * 0.3 +
    subs.corners * 0.3 +
    subs.edges * 0.2 +
    subs.surface * 0.2;
  const lowest = Math.min(subs.centering, subs.corners, subs.edges, subs.surface);
  // A weak sub-grade drags the ceiling down (no "averaging away" a flaw).
  const capped = Math.min(weighted, lowest + 1.5);
  const estimate = Math.max(1, Math.min(10, Math.round(capped * 2) / 2));

  const lo = Math.max(1, Math.floor(estimate));
  const hi = Math.min(10, Math.ceil(estimate));
  const band = lo === hi ? `PSA ${lo}` : `PSA ${lo}–${hi}`;

  let verdict: string;
  if (estimate >= 9.5) verdict = "Gem-mint candidate — strong grade upside.";
  else if (estimate >= 9) verdict = "Mint — likely worth grading.";
  else if (estimate >= 8) verdict = "Near-mint — grade only if the premium is there.";
  else if (estimate >= 6) verdict = "Played to excellent — usually better kept raw.";
  else verdict = "Condition issues — raw is the play.";

  return { estimate, band, verdict, subs };
}

/** The PSA tier label closest to an estimate, for matching the value ladder. */
export function nearestPsaLabel(estimate: number): string {
  return `PSA ${Math.round(estimate)}`;
}

// ── Auto-detection ─────────────────────────────────────────────────────────
//
// Best-effort, in-browser (no network): find the card's outer edge against the
// photo background, then try to find the inner print border by walking inward
// until the solid border colour gives way to the art. Returns null when it
// can't get a confident read, so the caller keeps the manual defaults.

type RGB = { r: number; g: number; b: number };

function at(d: Uint8ClampedArray, W: number, x: number, y: number): RGB {
  const i = (y * W + x) * 4;
  return { r: d[i] ?? 0, g: d[i + 1] ?? 0, b: d[i + 2] ?? 0 };
}
function dist(a: RGB, b: RGB): number {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

function insetFrame(f: Frame, frac: number): Frame {
  const w = f.right - f.left;
  const h = f.bottom - f.top;
  return {
    left: f.left + w * frac,
    right: f.right - w * frac,
    top: f.top + h * frac,
    bottom: f.bottom - h * frac,
  };
}

/** Walk inward from each card edge along the mid line until the solid border
 *  colour breaks (border → art) to locate the inner print border. */
function scanInner(
  d: Uint8ClampedArray,
  W: number,
  H: number,
  L: number,
  R: number,
  T: number,
  B: number,
): Frame | null {
  const midX = (L + R) >> 1;
  const midY = (T + B) >> 1;
  const cw = R - L;
  const ch = B - T;
  const inset = Math.max(1, Math.round(cw * 0.02));
  const TH = 70;
  const broke = (p: RGB, ref: RGB) => dist(p, ref) > TH;

  // Two consecutive deviating pixels = a real transition (ignores glare specks).
  const left = (() => {
    const ref = at(d, W, L + inset, midY);
    for (let x = L + 1; x < midX; x++)
      if (broke(at(d, W, x, midY), ref) && broke(at(d, W, x + 1, midY), ref)) return x;
    return L;
  })();
  const right = (() => {
    const ref = at(d, W, R - inset, midY);
    for (let x = R - 1; x > midX; x--)
      if (broke(at(d, W, x, midY), ref) && broke(at(d, W, x - 1, midY), ref)) return x;
    return R;
  })();
  const top = (() => {
    const ref = at(d, W, midX, T + inset);
    for (let y = T + 1; y < midY; y++)
      if (broke(at(d, W, midX, y), ref) && broke(at(d, W, midX, y + 1), ref)) return y;
    return T;
  })();
  const bottom = (() => {
    const ref = at(d, W, midX, B - inset);
    for (let y = B - 1; y > midY; y--)
      if (broke(at(d, W, midX, y), ref) && broke(at(d, W, midX, y - 1), ref)) return y;
    return B;
  })();

  // Sanity: each border between 1.5%–40% of the card, inner inside outer.
  const okX =
    left - L > cw * 0.015 &&
    R - right > cw * 0.015 &&
    left - L < cw * 0.4 &&
    R - right < cw * 0.4 &&
    left < right;
  const okY =
    top - T > ch * 0.015 &&
    B - bottom > ch * 0.015 &&
    top - T < ch * 0.4 &&
    B - bottom < ch * 0.4 &&
    top < bottom;
  if (!okX || !okY) return null;
  return {
    left: left / W,
    right: (right + 1) / W,
    top: top / H,
    bottom: (bottom + 1) / H,
  };
}

/**
 * Auto-detect the card's outer edge + inner print border from a loaded image.
 * Returns null if it can't confidently find a card (caller keeps defaults).
 */
export function detectCard(
  img: HTMLImageElement,
): { outer: Frame; inner: Frame } | null {
  if (!img.naturalWidth || !img.naturalHeight) return null;
  const W = 240;
  const H = Math.max(1, Math.round((W * img.naturalHeight) / img.naturalWidth));
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, W, H);
  let d: Uint8ClampedArray;
  try {
    d = ctx.getImageData(0, 0, W, H).data;
  } catch {
    return null; // tainted canvas — bail
  }

  // Background = average of four corner patches.
  const patch = (px: number, py: number): RGB => {
    let r = 0,
      g = 0,
      b = 0,
      n = 0;
    for (let y = py; y < py + 6; y++)
      for (let x = px; x < px + 6; x++) {
        const c = at(d, W, x, y);
        r += c.r;
        g += c.g;
        b += c.b;
        n++;
      }
    return { r: r / n, g: g / n, b: b / n };
  };
  const bgs = [patch(0, 0), patch(W - 6, 0), patch(0, H - 6), patch(W - 6, H - 6)];
  const bg = {
    r: bgs.reduce((s, c) => s + c.r, 0) / 4,
    g: bgs.reduce((s, c) => s + c.g, 0) / 4,
    b: bgs.reduce((s, c) => s + c.b, 0) / 4,
  };

  const TH = 60;
  const rowHas = new Array<number>(H).fill(0);
  const colHas = new Array<number>(W).fill(0);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (dist(at(d, W, x, y), bg) > TH) {
        rowHas[y] = (rowHas[y] ?? 0) + 1;
        colHas[x] = (colHas[x] ?? 0) + 1;
      }
    }
  const firstAbove = (arr: number[], min: number) =>
    arr.findIndex((v) => v >= min);
  const lastAbove = (arr: number[], min: number) => {
    for (let i = arr.length - 1; i >= 0; i--) if ((arr[i] ?? 0) >= min) return i;
    return -1;
  };
  const T = firstAbove(rowHas, W * 0.18);
  const Bo = lastAbove(rowHas, W * 0.18);
  const L = firstAbove(colHas, H * 0.18);
  const Ro = lastAbove(colHas, H * 0.18);
  // No confident bbox, or it's basically the whole frame (already cropped):
  // treat "whole frame" as a valid outer = full image.
  if (T < 0 || Bo < 0 || L < 0 || Ro < 0 || Ro - L < W * 0.25 || Bo - T < H * 0.25)
    return null;

  const outer: Frame = {
    left: L / W,
    right: (Ro + 1) / W,
    top: T / H,
    bottom: (Bo + 1) / H,
  };
  const inner = scanInner(d, W, H, L, Ro, T, Bo) ?? insetFrame(outer, 0.09);
  return { outer, inner };
}
