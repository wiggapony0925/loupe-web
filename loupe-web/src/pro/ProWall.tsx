import type { LucideIcon } from "lucide-react";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components";
import { cx } from "@/lib/cx";
import { PRO_FEATURE_BY_KEY, type ProFeatureKey } from "./proPlan";
import styles from "./ProWall.module.scss";

export type ProWallVariant = "card" | "overlay" | "inline";

export interface ProWallProps {
  /** Pulls default icon/title/blurb from the feature catalog. */
  feature?: ProFeatureKey;
  /** Overrides for the catalog defaults. */
  icon?: LucideIcon;
  title?: string;
  description?: string;
  /** Upgrade button label. */
  cta?: string;
  /** `card` = standalone panel · `overlay` = floats over blurred content ·
   *  `inline` = compact one-line row. */
  variant?: ProWallVariant;
  onUpgrade: () => void;
  className?: string;
}

/**
 * The reusable subscription wall — the single themed "this is a Pro feature"
 * UI. Never decides access itself (that's `useProFeature`/`ProGate`); it only
 * renders the locked state + the upgrade CTA, using the shared Button.
 */
export function ProWall({
  feature,
  icon,
  title,
  description,
  cta = "Upgrade to Pro",
  variant = "card",
  onUpgrade,
  className,
}: ProWallProps) {
  const meta = feature ? PRO_FEATURE_BY_KEY[feature] : undefined;
  const Icon = icon ?? meta?.icon ?? Lock;
  const heading = title ?? meta?.title ?? "A Loupe Pro feature";
  const body = description ?? meta?.blurb ?? "Upgrade to unlock this.";

  if (variant === "inline") {
    return (
      <div className={cx(styles.inline, className)}>
        <span className={styles.inlineIcon}>
          <Lock size={14} />
        </span>
        <span className={styles.inlineText}>{heading}</span>
        <Button size="sm" leadingIcon={<Sparkles size={14} />} onClick={onUpgrade}>
          {cta}
        </Button>
      </div>
    );
  }

  return (
    <div className={cx(styles.wall, variant === "overlay" && styles.overlay, className)}>
      <span className={styles.icon}>
        <Icon size={22} />
      </span>
      <h3 className={styles.title}>{heading}</h3>
      <p className={styles.desc}>{body}</p>
      <Button size="md" leadingIcon={<Sparkles size={16} />} onClick={onUpgrade}>
        {cta}
      </Button>
    </div>
  );
}
