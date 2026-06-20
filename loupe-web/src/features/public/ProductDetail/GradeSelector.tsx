import { cx } from "@/lib/cx";
import styles from "./GradeSelector.module.scss";

/** A price tier to chart: raw, or a graded company + grade. */
export interface PriceTier {
  house: string;
  grade?: string;
}

interface GradeOpt {
  /** Numeric grade the backend prices on. */
  g: string;
  /** Flagship designation (Gem Mint, Pristine, Black Label…). */
  tag?: string;
}

interface Company {
  key: string;
  label: string;
  /** Grades this house actually issues, chase-first. Empty for raw. */
  grades: GradeOpt[];
}

// The real grading scales (market-researched):
//  • PSA  — 1–10 with half-grades up to 8.5; NO 9.5; 10 = Gem Mint, 9 = Mint.
//  • BGS  — half-points; 9.5 = Gem Mint, 10 = Pristine (+ 10 Black Label).
//  • CGC  — 9.5 = Gem Mint, 10 = Gem Mint, "Pristine 10" = perfect.
//  • SGC  — 10 = Gem Mint ("Pristine 10" gold label at the very top).
const COMPANIES: Company[] = [
  { key: "raw", label: "Raw", grades: [] },
  {
    key: "psa",
    label: "PSA",
    grades: [
      { g: "10", tag: "GEM MT" },
      { g: "9", tag: "MINT" },
      { g: "8.5" },
      { g: "8" },
      { g: "7" },
      { g: "6" },
      { g: "5.5" },
      { g: "5" },
      { g: "4" },
      { g: "3" },
      { g: "2" },
      { g: "1.5" },
      { g: "1" },
    ],
  },
  {
    key: "bgs",
    label: "BGS",
    grades: [
      { g: "10", tag: "BLACK" },
      { g: "9.5", tag: "GEM MT" },
      { g: "9", tag: "MINT" },
      { g: "8.5" },
      { g: "8" },
      { g: "7" },
      { g: "6" },
      { g: "5" },
    ],
  },
  {
    key: "cgc",
    label: "CGC",
    grades: [
      { g: "10", tag: "PRISTINE" },
      { g: "9.5", tag: "GEM MT" },
      { g: "9", tag: "MINT" },
      { g: "8.5" },
      { g: "8" },
      { g: "7" },
      { g: "6" },
      { g: "5" },
    ],
  },
  {
    key: "sgc",
    label: "SGC",
    grades: [
      { g: "10", tag: "GEM" },
      { g: "9.5" },
      { g: "9" },
      { g: "8.5" },
      { g: "8" },
      { g: "7" },
      { g: "6" },
      { g: "5" },
    ],
  },
];

export function tierLabel(t: PriceTier): string {
  const c = COMPANIES.find((x) => x.key === t.house);
  if (!c || c.key === "raw") return "Raw";
  return `${c.label} ${t.grade ?? c.grades[0]?.g ?? ""}`.trim();
}

/**
 * Two-level price-tier selector for the card-detail chart: pick a grading
 * company, then a grade (real per-company scales, chase-first). Drives which
 * series the chart + readout show. The grade row scrolls on small screens.
 */
export function GradeSelector({ value, onChange }: { value: PriceTier; onChange: (t: PriceTier) => void }) {
  const company = COMPANIES.find((c) => c.key === value.house) ?? COMPANIES[0]!;

  return (
    <div className={styles.tiers}>
      <div className={styles.tiers__companies} role="tablist" aria-label="Grading company">
        {COMPANIES.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={c.key === value.house}
            className={cx(styles.tiers__company, c.key === value.house && styles["tiers__company--active"])}
            onClick={() => onChange({ house: c.key, grade: c.grades[0]?.g })}
          >
            {c.label}
          </button>
        ))}
      </div>

      {company.grades.length > 0 && (
        <div className={styles.tiers__grades} aria-label="Grade">
          {company.grades.map(({ g, tag }) => (
            <button
              key={g}
              type="button"
              aria-pressed={g === value.grade}
              className={cx(styles.tiers__grade, g === value.grade && styles["tiers__grade--active"])}
              onClick={() => onChange({ house: value.house, grade: g })}
            >
              <span className={styles.tiers__gradeNum}>
                {company.label} {g}
              </span>
              {tag && <span className={styles.tiers__gradeTag}>{tag}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
