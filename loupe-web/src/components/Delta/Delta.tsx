import { cx } from "@/lib/cx";
import { formatPercent, formatSignedMoney, trendOf } from "@/lib/format";
import type { Money } from "@loupe/core";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import styles from "./Delta.module.scss";

export interface DeltaProps {
  /** Percentage value already in percent units (e.g. 3.42 → "+3.42%"). */
  percent?: number;
  /** Optional money delta rendered alongside the percent. */
  money?: Money | number;
  /** Visual treatment: bare text, tinted pill, or with a directional arrow. */
  variant?: "text" | "pill" | "arrow";
  size?: "sm" | "md";
}

/** Signed gain/loss indicator — mint up, rose down — with tabular numerals. */
export function Delta({ percent = 0, money, variant = "text", size = "sm" }: DeltaProps) {
  const dir = trendOf(percent);
  const Arrow = dir === "down" ? ArrowDownRight : ArrowUpRight;
  return (
    <span className={cx(styles.delta, styles[dir], styles[variant], styles[size])}>
      {variant === "arrow" && dir !== "flat" && <Arrow className={styles.deltaIcon} />}
      {money !== undefined && <span className={styles.money}>{formatSignedMoney(money)}</span>}
      <span className={styles.pct}>{formatPercent(percent)}</span>
    </span>
  );
}
