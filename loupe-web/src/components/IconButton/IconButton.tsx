import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./IconButton.module.scss";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label — required since the button is icon-only. */
  label: string;
  size?: "sm" | "md";
  variant?: "ghost" | "solid";
  children: ReactNode;
}

/** Square, icon-only button with a mandatory aria-label. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = "md", variant = "ghost", className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      className={cx(styles.iconBtn, styles[size], styles[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
});
