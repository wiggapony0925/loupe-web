import { ToggleGroup } from "radix-ui";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeMode } from "@/theme";
import { Tooltip } from "@/components/Tooltip/Tooltip";
import styles from "./ThemeToggle.module.scss";

const OPTIONS: Array<{ value: ThemeMode; label: string; Icon: typeof Sun }> = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

/** Next mode in the light → dark → system cycle. */
function nextMode(mode: ThemeMode): ThemeMode {
  return mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
}

/**
 * Theme switcher. Default: a segmented light/dark/system control. With
 * `compact`, a single icon button that cycles modes — used in tight headers
 * (mobile/tablet) so it never wraps the sign-in button onto a new line.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useTheme();

  if (compact) {
    const current = OPTIONS.find((o) => o.value === mode);
    const Icon = current?.Icon ?? Monitor;
    const label = current?.label ?? "System";
    const next = nextMode(mode);
    return (
      <Tooltip content={`Theme: ${label}`}>
        <button
          type="button"
          className={styles.compact}
          onClick={() => setMode(next)}
          aria-label={`Theme: ${label}. Switch to ${next}.`}
        >
          <Icon />
        </button>
      </Tooltip>
    );
  }

  return (
    <ToggleGroup.Root
      type="single"
      className={styles.group}
      value={mode}
      onValueChange={(value) => value && setMode(value as ThemeMode)}
      aria-label="Theme"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <Tooltip key={value} content={label}>
          <ToggleGroup.Item value={value} className={styles.item} aria-label={label}>
            <Icon />
          </ToggleGroup.Item>
        </Tooltip>
      ))}
    </ToggleGroup.Root>
  );
}
