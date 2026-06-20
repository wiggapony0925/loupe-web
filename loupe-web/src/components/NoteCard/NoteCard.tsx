import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./NoteCard.module.scss";

export interface NoteCardProps {
  title: string;
  message?: string;
  icon?: ReactNode;
  variant?: "info" | "muted" | "warning";
  action?: ReactNode;
}

/** The canonical empty/info state — one component for every "no data yet" case. */
export function NoteCard({ title, message, icon, variant = "muted", action }: NoteCardProps) {
  return (
    <div className={cx(styles.note, styles[variant])}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <div className={styles.text}>
        <p className={styles.title}>{title}</p>
        {message && <p className={styles.message}>{message}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
