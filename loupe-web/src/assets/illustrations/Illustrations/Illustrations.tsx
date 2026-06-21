/** Spot illustrations for empty / error states. Inherit theme via CSS variables. */

export interface IllustrationProps {
  size?: number;
  className?: string;
}

/** No search results — a magnifier over an empty card. */
export function EmptyResultsArt({ size = 120, className }: IllustrationProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      role="img"
      aria-label="No results"
    >
      <rect x="22" y="26" width="52" height="70" rx="7" stroke="var(--line-strong)" strokeWidth="3" />
      <line x1="32" y1="44" x2="56" y2="44" stroke="var(--line-strong)" strokeWidth="3" strokeLinecap="round" />
      <line x1="32" y1="56" x2="64" y2="56" stroke="var(--line)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="74" cy="74" r="20" stroke="var(--accent-mint)" strokeWidth="4" fill="var(--bg-base)" />
      <line x1="88" y1="88" x2="102" y2="102" stroke="var(--accent-mint)" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** Empty chart — flat baseline awaiting data. */
export function EmptyChartArt({ size = 120, className }: IllustrationProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size * 0.66}
      viewBox="0 0 120 80"
      fill="none"
      role="img"
      aria-label="No data"
    >
      <path d="M8 70 H112" stroke="var(--line-strong)" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M8 56 H112"
        stroke="var(--accent-mint)"
        strokeWidth="3"
        strokeDasharray="6 8"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="60" cy="56" r="4" fill="var(--accent-mint)" />
    </svg>
  );
}
