/** Grade-aware overlays for the "compare grades" chart feature. */
export interface ComparePreset {
  /** Stable per-house key, so a toggled house stays on as the grade changes. */
  key: string;
  house: string;
  grade?: string;
  label: string;
  /** Line + swatch colour (distinct per house). */
  color: string;
}

/** Houses we can overlay, in display order (excludes the selected one + raw). */
const COMPARE_HOUSES = ["psa", "bgs", "cgc", "sgc", "tag"] as const;

const HOUSE_LABEL: Record<string, string> = {
  raw: "Raw",
  psa: "PSA",
  bgs: "BGS",
  cgc: "CGC",
  sgc: "SGC",
  tag: "TAG",
};

const HOUSE_COLOR: Record<string, string> = {
  raw: "#94a3b8",
  psa: "var(--accent-blue)",
  bgs: "#8b5cf6",
  cgc: "var(--accent-amber, #f59e0b)",
  sgc: "#ec4899",
  tag: "#14b8a6",
};

/**
 * Comparable numeric scales per house — what each house actually issues, used
 * to snap a target grade to that house's nearest real grade.
 *
 * ⚠️ Deliberately treats **BGS as topping out at 9.5** (its Gem-Mint chase).
 * BGS does mint a Pristine/Black-Label 10, but it's a rarity designation, not
 * the cross-house gem-mint equivalent — so a PSA/CGC/SGC/TAG 10 maps to a
 * BGS 9.5, the way the hobby actually compares them.
 */
const HOUSE_SCALE: Record<string, number[]> = {
  psa: [10, 9, 8.5, 8, 7, 6, 5.5, 5, 4, 3, 2, 1.5, 1],
  bgs: [9.5, 9, 8.5, 8, 7, 6, 5],
  cgc: [10, 9.5, 9, 8.5, 8, 7, 6, 5],
  sgc: [10, 9.5, 9, 8.5, 8, 7, 6, 5],
  tag: [10, 9.5, 9, 8.5, 8, 7, 6, 5],
};

/**
 * The grade a given house issues that's closest to *target*. Ties resolve
 * upward (a BGS 9.5 ⇢ PSA 10, not PSA 9). Returns the house's top grade when
 * the target exceeds what it issues.
 */
export function equivalentGrade(house: string, target: number): string | undefined {
  const scale = HOUSE_SCALE[house];
  if (!scale || scale.length === 0) return undefined;
  let best = scale[0]!;
  let bestDiff = Math.abs(best - target);
  for (const g of scale) {
    const diff = Math.abs(g - target);
    if (diff < bestDiff || (diff === bestDiff && g > best)) {
      best = g;
      bestDiff = diff;
    }
  }
  return String(best);
}

/**
 * Build the compare chips for the currently-selected tier.
 *
 * - A graded tier (e.g. PSA 7) → the **same grade** in every other house
 *   (BGS 7, CGC 7, SGC 7, TAG 7), each snapped to that house's real scale,
 *   plus a Raw baseline. Switch to PSA 8 and they all become 8.
 * - A raw tier → each house's gem-mint chase grade (PSA 10, BGS 9.5, …).
 *
 * Keys are the house id, so a chip the user turned on stays on (and just
 * re-grades) when they change the primary grade.
 */
export function buildComparePresets(tier: {
  house: string;
  grade?: string;
}): ComparePreset[] {
  const presets: ComparePreset[] = [];

  if (tier.house === "raw") {
    for (const h of COMPARE_HOUSES) {
      const g = String(HOUSE_SCALE[h]?.[0] ?? 10);
      presets.push({
        key: h,
        house: h,
        grade: g,
        label: `${HOUSE_LABEL[h]} ${g}`,
        color: HOUSE_COLOR[h] ?? "#94a3b8",
      });
    }
    return presets;
  }

  const target = Number(tier.grade ?? HOUSE_SCALE[tier.house]?.[0] ?? 10);
  for (const h of COMPARE_HOUSES) {
    if (h === tier.house) continue;
    const g = equivalentGrade(h, target);
    if (!g) continue;
    presets.push({
      key: h,
      house: h,
      grade: g,
      label: `${HOUSE_LABEL[h]} ${g}`,
      color: HOUSE_COLOR[h] ?? "#94a3b8",
    });
  }
  // Always offer the raw market as a baseline to compare a graded copy against.
  presets.push({ key: "raw", house: "raw", label: "Raw", color: HOUSE_COLOR.raw! });
  return presets;
}
