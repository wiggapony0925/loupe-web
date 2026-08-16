/**
 * TabBar — five-tab bottom navigation, Square style: monochrome line icons,
 * active = solid black. Sits above the home indicator via safe-area padding.
 */
import { NavLink } from 'react-router-dom';
import { useHaptics } from '@/hooks/useHaptics';

interface Tab {
  to: string;
  label: string;
  icon: JSX.Element;
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const TABS: Tab[] = [
  {
    to: '/',
    label: 'Home',
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
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  {
    to: '/sheet',
    label: 'Sheet',
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
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M7 20V10M12 20V4M17 20v-7" />
      </svg>
    ),
  },
  {
    to: '/circles',
    label: 'Circles',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <circle cx="9" cy="12" r="5.5" />
        <circle cx="15.5" cy="12" r="5.5" />
      </svg>
    ),
  },
];

export function TabBar() {
  const haptics = useHaptics();
  return (
    <nav className="tab-bar">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => `tab-bar__item${isActive ? ' tab-bar__item--active' : ''}`}
          onClick={() => haptics.impactLight()}
        >
          <span className="tab-bar__icon">{tab.icon}</span>
          <span className="tab-bar__label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
