import { cx } from "@/lib/cx";
import styles from "./MediaPlaceholder.module.scss";

export interface MediaPlaceholderProps {
  /** Which silhouette to draw. */
  kind?: "card" | "sealed";
  /** Render the loading shimmer — use this as a skeleton. */
  loading?: boolean;
  /** Optional caption under the glyph (e.g. a set name); hidden while loading. */
  label?: string;
  /** CSS aspect-ratio; defaults to 5/7 (a card/box). */
  ratio?: string;
  className?: string;
}

/** A clean booster-pack silhouette in line art. */
function SealedGlyph() {
  return (
    <svg viewBox="0 0 48 64" fill="none" aria-hidden focusable="false">
      <path
        d="M11 17h26a3 3 0 0 1 3 3v34a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V20a3 3 0 0 1 3-3Z"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      {/* Foil tear seam */}
      <path
        d="M9 24l4-2 4 2 4-2 4 2 4-2 4 2 4-2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M24 33v14M19 40h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {/* Spark */}
      <path
        d="M34 8.5l1.4 3.1 3.1 1.4-3.1 1.4L34 18.5l-1.4-3.1L29.5 14l3.1-1.4L34 8.5Z"
        className={styles.spark}
      />
    </svg>
  );
}

/** A trading-card silhouette in line art. */
function CardGlyph() {
  return (
    <svg viewBox="0 0 48 64" fill="none" aria-hidden focusable="false">
      <rect x="9" y="8" width="30" height="48" rx="4" stroke="currentColor" strokeWidth="2.4" />
      <rect x="14" y="14" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="2.2" />
      <path d="M14 40h20M14 47h13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="31.5" cy="46.5" r="3.4" className={styles.spark} />
    </svg>
  );
}

/**
 * The one canonical "no image / loading" surface — a soft, theme-tinted field
 * with a line-art product glyph (card or sealed pack). Doubles as the image
 * skeleton when `loading`, so empty and loading states look identical and
 * on-brand. Replaces the old per-set gradient covers.
 */
export function MediaPlaceholder({
  kind = "card",
  loading = false,
  label,
  ratio = "5 / 7",
  className,
}: MediaPlaceholderProps) {
  return (
    <div
      className={cx(styles.ph, loading && styles.loading, className)}
      style={{ aspectRatio: ratio }}
      role="img"
      aria-label={label ?? (kind === "sealed" ? "Sealed product" : "Card")}
    >
      <span className={styles.glyph}>
        {kind === "sealed" ? <SealedGlyph /> : <CardGlyph />}
      </span>
      {label && !loading && <span className={styles.label}>{label}</span>}
    </div>
  );
}
