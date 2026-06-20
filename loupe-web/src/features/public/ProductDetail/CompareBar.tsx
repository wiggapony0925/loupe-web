import { cx } from "@/lib/cx";
import { COMPARE_PRESETS } from "./compareTiers";
import styles from "./CompareBar.module.scss";

/**
 * Toggleable preset chips that overlay extra grade tiers on the price chart
 * (e.g. compare a PSA 10 against a TAG 10). Each chip carries its line colour
 * as a swatch so the legend reads at a glance.
 */
export function CompareBar({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className={styles.compare}>
      <span className={styles.compare__label}>Compare</span>
      <div className={styles.compare__chips}>
        {COMPARE_PRESETS.map((p) => {
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
