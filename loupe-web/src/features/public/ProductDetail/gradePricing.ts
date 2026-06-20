/**
 * Client-side mirror of the backend per-grade price model
 * (`card_search_service._GRADE_MULT_HISTORY` / `_HOUSE_DRIFT_HISTORY`).
 *
 * It returns the *central* estimate — the random jitter the chart layers on
 * is dropped — so a grade chip's number sits in the middle of the band the
 * chart draws for that exact tier. The raw price itself is real (PriceCharting
 * / catalog market); the graded tiers are modeled until a graded comps feed is
 * available, matching what the chart already shows.
 */

const HOUSE_DRIFT: Record<string, number> = {
  raw: 1.0,
  psa: 1.0,
  cgc: 0.95,
  bgs: 1.05,
  sgc: 0.92,
  tag: 0.85,
};

// [lo, hi] multiplier vs the raw price, per numeric grade (full 1–10 + halves).
const GRADE_MULT: Record<string, [number, number]> = {
  "10": [10, 18],
  "9.5": [5, 8],
  "9": [2.5, 4],
  "8.5": [1.6, 2.2],
  "8": [1.2, 1.6],
  "7.5": [1.0, 1.3],
  "7": [0.9, 1.1],
  "6.5": [0.8, 0.92],
  "6": [0.7, 0.78],
  "5.5": [0.62, 0.7],
  "5": [0.55, 0.62],
  "4.5": [0.5, 0.55],
  "4": [0.45, 0.52],
  "3.5": [0.4, 0.45],
  "3": [0.35, 0.4],
  "2.5": [0.3, 0.35],
  "2": [0.25, 0.3],
  "1.5": [0.2, 0.25],
  "1": [0.15, 0.2],
};

function vintageFactor(year?: number): number {
  if (!year) return 0.4;
  if (year <= 1995) return 1.0;
  if (year >= 2020) return 0.0;
  return Math.max(0, Math.min(1, (2020 - year) / 25));
}

/** Central per-tier price estimate; `null` when we can't price it. */
export function estimateTierPrice(
  rawBase: number | undefined,
  house: string,
  grade?: string,
  year?: number,
): number | null {
  if (!rawBase || rawBase <= 0) return null;
  if (house === "raw" || !house) return rawBase;
  const drift = HOUSE_DRIFT[house] ?? 1.0;
  if (!grade) return rawBase * drift;
  const band = GRADE_MULT[grade];
  if (!band) return rawBase * drift;
  const [lo, hi] = band;
  const vf = vintageFactor(year);
  // Mirror _scaled_base's blend, central (drop the 0.85–1.15 jitter → 1.0).
  let mult = lo + (hi - lo) * (0.25 + 0.75 * vf);
  // BGS 10 Black Label premium (central of the 1.4–2.0 band).
  if (house === "bgs" && grade === "10") mult *= 1.7;
  return rawBase * mult * drift;
}
