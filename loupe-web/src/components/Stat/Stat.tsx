import type { ReactNode } from "react";
import styles from "./Stat.module.scss";

export interface StatProps {
  label: string;
  value: ReactNode;
  /** Optional trailing delta or hint under the value. */
  hint?: ReactNode;
  align?: "start" | "end";
}

/** Label-over-value metric block with tabular numerals. */
export function Stat({ label, value, hint, align = "start" }: StatProps) {
  return (
    <div className={styles.stat} data-align={align}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
