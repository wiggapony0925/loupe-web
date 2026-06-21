import { cx } from "@/lib/cx";
import styles from "./Logo.module.scss";

export interface LogoProps {
  /** Mark height in px. */
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

/** Loupe identity — a lens mark with an embedded market line + optional wordmark. */
export function Logo({ size = 28, showWordmark = true, className }: LogoProps) {
  return (
    <span className={cx(styles.logo, className)}>
      <svg
        className={styles.logo__mark}
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        role="img"
        aria-label="Loupe"
      >
        <circle cx="14" cy="14" r="11" stroke="var(--accent-mint)" strokeWidth="2.4" />
        <path
          d="M8.5 16.5 L12 12.5 L15 15 L20 9.5"
          stroke="var(--accent-mint)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="9.5" r="1.8" fill="var(--accent-mint)" />
        <line
          x1="22.2"
          y1="22.2"
          x2="29"
          y2="29"
          stroke="var(--ink)"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
      {showWordmark && <span className={styles.logo__word}>Loupe</span>}
    </span>
  );
}
