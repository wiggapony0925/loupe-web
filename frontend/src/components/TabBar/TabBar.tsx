/**
 * TabBar — five-tab bottom navigation, Square style: monochrome line icons,
 * active = solid black. Sits above the home indicator via safe-area padding.
 */
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '@/components/Nav/navItems';
import { useHaptics } from '@/hooks/useHaptics';

// The phone bar carries the primary five; the sidebar (≥ md) shows them all.
const TABS = NAV_ITEMS.filter((item) => item.primary);

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
