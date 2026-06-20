/**
 * TS-side handles for the design tokens. CSS owns the real values (tokens.scss);
 * these are stable `var(--…)` references so JS-driven SVG (sparklines, dots) and
 * inline styles can read theme colors without hardcoding hex — keeping the
 * Light/Dark toggle intact, exactly like the RN app's `palette` rule.
 */
export const token = {
  bg: { base: "var(--bg-base)", elevated: "var(--bg-elevated)", sunken: "var(--bg-sunken)" },
  line: { default: "var(--line)", strong: "var(--line-strong)" },
  ink: { default: "var(--ink)", muted: "var(--ink-muted)", dim: "var(--ink-dim)" },
  accent: {
    mint: "var(--accent-mint)",
    blue: "var(--accent-blue)",
    amber: "var(--accent-amber)",
    rose: "var(--accent-rose)",
    purple: "var(--accent-purple)",
  },
  up: "var(--up)",
  down: "var(--down)",
} as const;

/** Maps a 1–10 grade to its semantic accent — mirrors `gradeColor()` in the RN app. */
export function gradeColor(grade: number): string {
  if (grade >= 10) return token.accent.mint;
  if (grade >= 9) return token.accent.blue;
  if (grade >= 7) return token.accent.amber;
  return token.accent.rose;
}

/** Direction color for a delta: gains mint, losses rose, flat dim. */
export function deltaColor(value: number): string {
  if (value > 0) return token.up;
  if (value < 0) return token.down;
  return token.ink.dim;
}
