import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { useProFeature } from "./useProFeature";
import { ProWall } from "./ProWall";
import type { PaywallReason } from "./ProProvider";
import type { ProFeatureKey } from "./proPlan";
import styles from "./ProGate.module.scss";

export interface ProGateProps {
  /** The Pro capability this content requires. */
  feature: ProFeatureKey;
  /** `replace` swaps the content for a wall; `blur` shows it blurred behind
   *  a floating wall (the "preview of value" pattern). */
  mode?: "replace" | "blur";
  /** Override the wall's copy/CTA (defaults come from the feature catalog). */
  title?: string;
  description?: string;
  cta?: string;
  /** Override the paywall headline reason (defaults to the feature's reason). */
  reason?: PaywallReason;
  className?: string;
  children: ReactNode;
}

/**
 * Declarative subscription wall. Renders `children` when the user is entitled;
 * otherwise renders the reusable `ProWall`. One consistent gate for every Pro
 * surface — no bespoke locked states per feature.
 *
 *   <ProGate feature="statements" mode="blur"><Archive /></ProGate>
 */
export function ProGate({
  feature,
  mode = "replace",
  title,
  description,
  cta,
  reason,
  className,
  children,
}: ProGateProps) {
  const { allowed, requirePro } = useProFeature(feature);
  if (allowed) return <>{children}</>;

  const wall = (
    <ProWall
      feature={feature}
      title={title}
      description={description}
      cta={cta}
      variant={mode === "blur" ? "overlay" : "card"}
      onUpgrade={() => requirePro(reason)}
    />
  );

  if (mode === "blur") {
    return (
      <div className={cx(styles.blurWrap, className)}>
        {/* Blurred, non-interactive preview behind the wall. */}
        <div
          className={styles.preview}
          aria-hidden
          ref={(el) => el?.setAttribute("inert", "")}
        >
          {children}
        </div>
        {wall}
      </div>
    );
  }

  return <div className={className}>{wall}</div>;
}
