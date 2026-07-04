import { Switch as RS } from "radix-ui";
import { cx } from "@/lib/cx";
import styles from "./Switch.module.scss";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label": string;
}

/** On/off toggle (settings switches) built on Radix Switch. */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: SwitchProps) {
  return (
    <RS.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cx(styles.root, className)}
    >
      <RS.Thumb className={styles.thumb} />
    </RS.Root>
  );
}
