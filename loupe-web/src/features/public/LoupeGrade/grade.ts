/**
 * Loupe Grade — web entry.
 *
 * The rubric engine (centering math + sub-grade blend) now lives in the
 * framework-agnostic `@loupe/grade` package, shared with the native app so
 * both compute the identical estimate. This file re-exports that engine and
 * keeps the browser-only canvas auto-detection (`detectCard`) — it needs
 * `HTMLImageElement` + `canvas`, which don't belong in the shared core.
 */
export {
  centeringGrade,
  loupeGrade,
  measureCentering,
  nearestPsaLabel,
} from "@loupe/grade";
export type {
  Centering,
  Frame,
  LoupeGradeResult,
  SubGrades,
} from "@loupe/grade";

import type { Frame } from "@loupe/grade";

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
