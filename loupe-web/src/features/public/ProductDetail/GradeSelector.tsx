import { cx } from "@/lib/cx";
import styles from "./GradeSelector.module.scss";

/** A price tier to chart: raw, or a graded company + grade. */
export interface PriceTier {
  house: string;
  grade?: string;
}

interface Company {
  key: string;
  label: string;
  /** Grades this house actually issues, chase-first. Empty for raw. */
  grades: string[];
}

/** Raw + the major grading companies. The backend synthesises any tier. */
const COMPANIES: Company[] = [
  { key: "raw", label: "Raw", grades: [] },
  { key: "psa", label: "PSA", grades: ["10", "9", "8"] },
  { key: "bgs", label: "BGS", grades: ["10", "9.5", "9"] },
  { key: "cgc", label: "CGC", grades: ["10", "9.5", "9"] },
  { key: "sgc", label: "SGC", grades: ["10", "9.5", "9"] },
];

export function tierLabel(t: PriceTier): string {
  const c = COMPANIES.find((x) => x.key === t.house);
  if (!c || c.key === "raw") return "Raw";
  return `${c.label} ${t.grade ?? c.grades[0]}`;
}

/**
 * Two-level price-tier selector for the card-detail chart: pick a grading
 * company, then a grade. Drives which series the chart + readout show.
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
            onClick={() => onChange({ house: c.key, grade: c.grades[0] })}
          >
            {c.label}
          </button>
        ))}
      </div>

      {company.grades.length > 0 && (
        <div className={styles.tiers__grades} aria-label="Grade">
          {company.grades.map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={g === value.grade}
              className={cx(styles.tiers__grade, g === value.grade && styles["tiers__grade--active"])}
              onClick={() => onChange({ house: value.house, grade: g })}
            >
              {company.label} {g}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
