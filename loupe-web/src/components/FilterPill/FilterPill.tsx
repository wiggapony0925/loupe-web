import { DropdownMenu } from "radix-ui";
import { Check, ChevronDown, X } from "lucide-react";
import { cx } from "@/lib/cx";
import styles from "./FilterPill.module.scss";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterPillProps {
  label: string;
  options: FilterOption[];
  /** Currently selected value, or null when unset. */
  value: string | null;
  onChange: (value: string | null) => void;
}

/** TCGplayer-style filter pill — a Radix dropdown of single-select options. */
export function FilterPill({ label, options, value, onChange }: FilterPillProps) {
  const active = value !== null;
  const selected = options.find((o) => o.value === value);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className={cx(styles["filter-pill"], active && styles["filter-pill--active"])}>
          {active ? selected?.label ?? label : label}
          {active ? (
            <X
              className={styles["filter-pill__clear"]}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(null);
              }}
            />
          ) : (
            <ChevronDown className={styles["filter-pill__chevron"]} />
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles["filter-pill__menu"]} align="start" sideOffset={6}>
          {options.map((opt) => (
            <DropdownMenu.Item
              key={opt.value}
              className={styles["filter-pill__option"]}
              onSelect={() => onChange(opt.value)}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check className={styles["filter-pill__check"]} />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
