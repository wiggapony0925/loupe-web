import type { CSSProperties, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { gradeColor } from "@/theme";
import styles from "./Badge.module.scss";

type Tone = "neutral" | "mint" | "blue" | "amber" | "rose" | "purple";

export interface BadgeProps {
  tone?: Tone;
  /** Show a leading accent dot (Robinhood/App-Store strip feel). */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

/** Compact, tinted label pill. Tones map to the accent palette. */
export function Badge({ tone = "neutral", dot, children, className }: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[tone], className)}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  );
}

/** Grade chip (PSA 10, CGC 9 …) colored by the same `gradeColor()` scale as the app. */
export function GradeBadge({ grade, company }: { grade: number; company?: string }) {
  const color = gradeColor(grade);
  const style = { "--grade-color": color } as CSSProperties;
  return (
    <span className={styles.grade} style={style}>
      {company ? `${company} ` : ""}
      {grade}
    </span>
  );
}
