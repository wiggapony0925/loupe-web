import type { GradeHouse, RawCondition } from "@loupe/core";

/** Grading houses — mirrors the mobile app's GradeForm. `loupe` = raw/ungraded. */
export const HOUSES: { value: GradeHouse; label: string }[] = [
  { value: "psa", label: "PSA" },
  { value: "bgs", label: "BGS" },
  { value: "cgc", label: "CGC" },
  { value: "sgc", label: "SGC" },
  { value: "loupe", label: "RAW" },
];

/** Raw-card condition vocabulary (only meaningful when `house === "loupe"`). */
export const CONDITIONS: { value: RawCondition; label: string }[] = [
  { value: "nm", label: "NM" },
  { value: "lp", label: "LP" },
  { value: "mp", label: "MP" },
  { value: "hp", label: "HP" },
  { value: "dmg", label: "DMG" },
];

/** Compact grade label for badges/rows, e.g. "PSA 10" or "RAW NM". */
export function gradeLabel(house: string, grade: number, condition?: string | null): string {
  if (house === "loupe") return `RAW${condition ? ` ${condition.toUpperCase()}` : ""}`;
  const g = Number.isInteger(grade) ? grade : grade.toFixed(1);
  return `${house.toUpperCase()} ${g}`;
}
