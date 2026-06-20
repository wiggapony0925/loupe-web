import { cx } from "@/lib/cx";
import styles from "./AuroraField.module.scss";

export interface AuroraFieldProps {
  /** "hero" = vivid (landing); "subtle" = quiet page wash. */
  variant?: "hero" | "subtle";
  className?: string;
}

/**
 * Decorative animated background — drifting aurora blobs, a faint market grid,
 * and a slow ticker line. Pure CSS animation (60fps), inert, reduced-motion aware.
 */
export function AuroraField({ variant = "subtle", className }: AuroraFieldProps) {
  return (
    <div className={cx(styles.aurora, styles[`aurora--${variant}`], className)} aria-hidden>
      <span className={cx(styles.aurora__blob, styles["aurora__blob--mint"])} />
      <span className={cx(styles.aurora__blob, styles["aurora__blob--blue"])} />
      <span className={cx(styles.aurora__blob, styles["aurora__blob--purple"])} />
      <span className={styles.aurora__grid} />
      <svg className={styles.aurora__line} viewBox="0 0 1200 320" preserveAspectRatio="none">
        <path
          className={styles["aurora__line-path"]}
          d="M0 230 C 140 190 240 250 380 210 S 600 130 760 180 S 1000 120 1200 158"
          fill="none"
        />
      </svg>
    </div>
  );
}
