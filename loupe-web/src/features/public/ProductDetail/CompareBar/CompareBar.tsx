import { cx } from "@/lib/cx";
import type { ComparePreset } from "../compareTiers";
import styles from "./CompareBar.module.scss";

/**
 * Toggleable chips that overlay extra grade tiers on the price chart. The
 * presets are grade-aware: when the primary grade is PSA 7 the chips are
 * BGS 7 / CGC 7 / TAG 7 / Raw; switch to PSA 8 and they re-grade to 8. Each
 * chip carries its line colour as a swatch so the legend reads at a glance.
 */
export function CompareBar({
  presets,
  selected,
  onToggle,
}: {
  presets: ComparePreset[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  if (presets.length === 0) return null;
  return (
    <div className={styles.compare}>
      <span className={styles.compare__label}>Compare</span>
      <div className={styles.compare__chips}>
        {presets.map((p) => {
          const on = selected.includes(p.key);
          return (
            <button
              key={p.key}
              type="button"
              aria-pressed={on}
              className={cx(
                styles.compare__chip,
                on && styles["compare__chip--on"],
              )}
              onClick={() => onToggle(p.key)}
              style={on ? { borderColor: p.color, color: p.color } : undefined}
            >
              <span
                className={styles.compare__swatch}
                style={{ background: p.color }}
              />
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
