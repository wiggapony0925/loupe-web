import { forwardRef, type HTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import styles from "./Panel.module.scss";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Surface level — picks the themed background. */
  level?: "elevated" | "sunken" | "base";
  /** Inner padding step. */
  padding?: "none" | "sm" | "md" | "lg";
  /** Adds the soft card shadow for hero surfaces. */
  raised?: boolean;
  /** Highlights the border + lifts on hover (for clickable cards). */
  interactive?: boolean;
}

/** The canonical "flat elevated card" surface — every section sits on one. */
export const Panel = forwardRef<HTMLDivElement, PanelProps>(function Panel(
  { level = "elevated", padding = "md", raised, interactive, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx(
        styles.panel,
        styles[`bg-${level}`],
        styles[`pad-${padding}`],
        raised && styles.raised,
        interactive && styles.interactive,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
