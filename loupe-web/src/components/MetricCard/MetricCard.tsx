import type { ReactNode } from "react";
import type { Money } from "@loupe/core";
import { cx } from "@/lib/cx";
import { Delta } from "@/components/Delta/Delta";
import styles from "./MetricCard.module.scss";

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  /** Small leading glyph shown in a tinted chip. */
  icon?: ReactNode;
  /** Tint for the icon chip + (optional) accent wash. */
  tone?: "mint" | "blue" | "amber" | "rose" | "purple" | "neutral";
  /** Signed % change → rendered as a tinted pill. */
  changePct?: number;
  /** Optional money delta rendered inside the pill alongside the %. */
  changeMoney?: Money | number;
  /** Quiet caption under the value (e.g. "vs last month"). */
  caption?: string;
  /** Subtle tinted background — used for the highlighted hero metric. */
  accent?: boolean;
  onClick?: () => void;
}

/**
 * A "bento" metric card — label + leading icon chip, an oversized tabular
 * value, an inline delta pill, and a quiet caption. The building block of the
 * dashboard overview row. Fully theme-token driven (works in light + dark).
 */
export function MetricCard({
  label,
  value,
  icon,
  tone = "neutral",
  changePct,
  changeMoney,
  caption,
  accent,
  onClick,
}: MetricCardProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cx(styles.card, styles[tone], accent && styles.accent, onClick && styles.clickable)}
    >
      <span className={styles.top}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <span className={styles.label}>{label}</span>
      </span>
      <span className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {changePct !== undefined && (
          <Delta percent={changePct} money={changeMoney} variant="pill" />
        )}
      </span>
      {caption && <span className={styles.caption}>{caption}</span>}
    </Tag>
  );
}
