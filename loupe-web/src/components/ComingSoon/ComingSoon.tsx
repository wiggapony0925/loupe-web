import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cx } from "@/lib/cx";
import styles from "./ComingSoon.module.scss";

export interface ComingSoonProps {
  title?: string;
  message?: string;
  badge?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Reusable "coming soon" panel — for unbuilt games, features, and routes. */
export function ComingSoon({
  title = "Coming soon",
  message = "We're still building this. Check back shortly.",
  badge = "Coming soon",
  icon,
  action,
  className,
}: ComingSoonProps) {
  return (
    <div className={cx(styles.coming, className)}>
      <span className={styles.coming__badge}>{badge}</span>
      <span className={styles.coming__icon}>{icon ?? <Sparkles />}</span>
      <h2 className={styles.coming__title}>{title}</h2>
      <p className={styles.coming__message}>{message}</p>
      {action && <div className={styles.coming__action}>{action}</div>}
    </div>
  );
}
