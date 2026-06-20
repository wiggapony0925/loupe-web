import type { ReactNode } from "react";
import styles from "./SectionHeader.module.scss";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional right-aligned control (e.g. a "See all" link or segmented control). */
  action?: ReactNode;
}

/** Quiet section heading — bold title, dim subtitle, optional trailing action. */
export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.text}>
        <h2 className={styles.title}>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
