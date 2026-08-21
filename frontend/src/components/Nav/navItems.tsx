/**
 * The app's navigation, defined once. The mobile TabBar and the desktop
 * Sidebar both render from this list, so a new destination can never appear
 * on one form factor and go missing on the other.
 */
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export interface NavItem {
  to: string;
  label: string;
  /** Longer label used where there's room (sidebar). */
  longLabel?: string;
  icon: JSX.Element;
  /** Bottom tab bar shows only the primary five; the sidebar shows all. */
  primary: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Home',
    longLabel: 'Dashboard',
    primary: true,
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10v9h13v-9" />
      </svg>
    ),
  },
  {
    to: '/feed',
    label: 'Feed',
    longLabel: 'Activity',
    primary: true,
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  {
    to: '/sheet',
    label: 'Sheet',
    longLabel: 'Spreadsheet',
    primary: true,
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <rect x="4" y="5" width="16" height="14" />
        <path d="M4 10h16M10 5v14" />
      </svg>
    ),
  },
  {
    to: '/ledger',
    label: 'Ledger',
    primary: true,
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M7 20V10M12 20V4M17 20v-7" />
      </svg>
    ),
  },
  {
    to: '/circles',
    label: 'Circles',
    primary: true,
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <circle cx="9" cy="12" r="5.5" />
        <circle cx="15.5" cy="12" r="5.5" />
      </svg>
    ),
  },
  {
    // Reachable on mobile from Home; on desktop there's room to make it a
    // first-class destination rather than a card tap.
    to: '/recurring',
    label: 'Recurring',
    primary: false,
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2M20 4v4h-4M4 20v-4h4" />
      </svg>
    ),
  },
];
