/** Preset overlays for the "compare grades" chart feature. */
export interface ComparePreset {
  key: string;
  house: string;
  grade?: string;
  label: string;
  /** Line + swatch colour (distinct per preset). */
  color: string;
}

/**
 * Cross-house chase grades + raw — the meaningful tiers to overlay on the
 * price chart (e.g. a PSA 10 gem-mint vs a TAG 10). Each is structurally a
 * `ChartTier`, so the selected subset passes straight to `CardPriceChart`.
 */
export const COMPARE_PRESETS: ComparePreset[] = [
  { key: "raw", house: "raw", label: "Raw", color: "#94a3b8" },
  { key: "psa10", house: "psa", grade: "10", label: "PSA 10", color: "var(--accent-blue)" },
  { key: "bgs95", house: "bgs", grade: "9.5", label: "BGS 9.5", color: "#8b5cf6" },
  { key: "cgc10", house: "cgc", grade: "10", label: "CGC 10", color: "var(--accent-amber, #f59e0b)" },
  { key: "sgc10", house: "sgc", grade: "10", label: "SGC 10", color: "#ec4899" },
  { key: "tag10", house: "tag", grade: "10", label: "TAG 10", color: "#14b8a6" },
];
