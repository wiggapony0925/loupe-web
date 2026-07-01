/**
 * Lightweight in-browser card-edge detector for the adaptive reticle.
 *
 * A card held in frame is *busier* (edges, text, art) than a typical
 * background, so we downscale the frame, measure per-row / per-column edge
 * energy, and take the bounding box of the high-energy region. It's a best
 * effort — cluttered backgrounds defeat it, which is why the caller keeps a
 * static centred reticle as the fallback (returns `null`). No OpenCV, no
 * network; just a ~100px scratch canvas and one gradient pass (sub-millisecond).
 *
 * The returned rect is already mapped to **viewport fractions** (0–1),
 * accounting for the video's `object-fit: cover` crop, so the caller can place
 * the reticle with plain `left/top/width/height` percentages.
 */

export interface DetectRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const DW = 104; // scratch width; height derived from the frame aspect

export function detectCardRect(
  video: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
): DetectRect | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh || viewW <= 0 || viewH <= 0) return null;

  const dh = Math.max(8, Math.round((DW * vh) / vw));
  ctx.canvas.width = DW;
  ctx.canvas.height = dh;
  ctx.drawImage(video, 0, 0, DW, dh);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, DW, dh).data;
  } catch {
    return null; // tainted canvas (shouldn't happen same-origin) — bail
  }

  const lum = new Float32Array(DW * dh);
  for (let i = 0; i < DW * dh; i++) {
    lum[i] = 0.299 * data[i * 4]! + 0.587 * data[i * 4 + 1]! + 0.114 * data[i * 4 + 2]!;
  }

  const colE = new Float32Array(DW);
  const rowE = new Float32Array(dh);
  let total = 0;
  for (let y = 1; y < dh - 1; y++) {
    for (let x = 1; x < DW - 1; x++) {
      const i = y * DW + x;
      const gx = Math.abs(lum[i + 1]! - lum[i - 1]!);
      const gy = Math.abs(lum[i + DW]! - lum[i - DW]!);
      const g = gx + gy;
      colE[x]! += g;
      rowE[y]! += g;
      total += g;
    }
  }
  if (total < 1) return null;

  // A bin is "card content" when its edge energy clears a fraction of the mean.
  const colThr = (total / DW) * 0.5;
  const rowThr = (total / dh) * 0.5;
  const [x0, x1] = span(colE, colThr);
  const [y0, y1] = span(rowE, rowThr);
  if (x1 <= x0 || y1 <= y0) return null;

  // Frame-fraction box, padded slightly so the reticle frames the card edge.
  const pad = 0.015;
  const fx = Math.max(0, x0 / DW - pad);
  const fy = Math.max(0, y0 / dh - pad);
  const fw = Math.min(1, x1 / DW + pad) - fx;
  const fh = Math.min(1, y1 / dh + pad) - fy;

  // Reject implausible detections — too small, too full-frame, or not roughly
  // card-shaped (portrait 2.5:3.5 ≈ 0.71 aspect, allow a wide tolerance).
  if (fw < 0.28 || fh < 0.28 || fw > 0.97 || fh > 0.97) return null;
  const boxAspect = (fw * vw) / (fh * vh);
  if (boxAspect < 0.45 || boxAspect > 1.15) return null;

  // Map frame fractions → viewport fractions through the object-fit: cover crop.
  const cover = Math.max(viewW / vw, viewH / vh);
  const dispW = vw * cover;
  const dispH = vh * cover;
  const cropX = (dispW - viewW) / 2;
  const cropY = (dispH - viewH) / 2;
  const left = (fx * dispW - cropX) / viewW;
  const top = (fy * dispH - cropY) / viewH;
  const width = (fw * dispW) / viewW;
  const height = (fh * dispH) / viewH;

  return {
    left: clamp01(left),
    top: clamp01(top),
    width: Math.min(1 - clamp01(left), width),
    height: Math.min(1 - clamp01(top), height),
  };
}

/** First and last index whose value clears the threshold. */
function span(arr: Float32Array, thr: number): [number, number] {
  let lo = -1;
  let hi = -1;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]! >= thr) {
      if (lo < 0) lo = i;
      hi = i;
    }
  }
  return [lo < 0 ? 0 : lo, hi < 0 ? 0 : hi];
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Ease the reticle toward a new rect so it glides instead of snapping. */
export function lerpRect(a: DetectRect, b: DetectRect, t: number): DetectRect {
  return {
    left: a.left + (b.left - a.left) * t,
    top: a.top + (b.top - a.top) * t,
    width: a.width + (b.width - a.width) * t,
    height: a.height + (b.height - a.height) * t,
  };
}
