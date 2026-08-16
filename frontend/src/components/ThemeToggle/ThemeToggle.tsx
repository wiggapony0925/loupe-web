/**
 * ThemeToggle — cycles system → dark → light. Shows the CURRENT mode
 * (auto / moon / sun) with a little rotate-in on change.
 */
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider';
import { useHaptics } from '@/hooks/useHaptics';

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const ICONS: Record<ThemeMode, JSX.Element> = {
  system: (
    // Half-filled circle: "follow the system, whichever half it's in".
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 0 0 17Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M20 13.5A8 8 0 1 1 10.5 4 6.5 6.5 0 0 0 20 13.5Z" />
    </svg>
  ),
  light: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19" />
    </svg>
  ),
};

const LABEL: Record<ThemeMode, string> = {
  system: 'Theme: match system',
  dark: 'Theme: dark',
  light: 'Theme: light',
};

export function ThemeToggle() {
  const { mode, cycleMode } = useTheme();
  const haptics = useHaptics();

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={LABEL[mode]}
      title={LABEL[mode]}
      onClick={() => {
        haptics.impactLight();
        cycleMode();
      }}
    >
      <span key={mode} className="theme-toggle__icon">
        {ICONS[mode]}
      </span>
    </button>
  );
}
