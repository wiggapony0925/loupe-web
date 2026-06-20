import { ToggleGroup } from "radix-ui";
import { cx } from "@/lib/cx";
import styles from "./SegmentedControl.module.scss";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  "aria-label": string;
}

/** Generic pill segmented control (time ranges, filters) built on Radix ToggleGroup. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "sm",
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => next && onChange(next as T)}
      aria-label={ariaLabel}
      className={cx(styles.group, styles[size], className)}
    >
      {options.map((opt) => (
        <ToggleGroup.Item key={opt.value} value={opt.value} className={styles.item}>
          {opt.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
