/**
 * Sidebar — the desktop navigation rail (≥ md), replacing the bottom tab
 * bar. Same destinations as the TabBar (shared NAV_ITEMS), plus room for the
 * wordmark, the recurring total, and the theme toggle.
 *
 * CSS decides which of the two renders; both stay mounted-free of each other
 * so neither has to know the viewport.
 */
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '@/components/Nav/navItems';
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle';
import { useHaptics } from '@/hooks/useHaptics';
import { useLedgerStore } from '@/store/useLedgerStore';
import { money } from '@/lib/format';

export function Sidebar() {
  const haptics = useHaptics();
  const me = useLedgerStore((s) => s.me);
  const recurring = useLedgerStore((s) => s.recurring);
  const needsTagging = useLedgerStore(
    (s) => s.feed.filter((t) => t.status === 'REQUIRES_TAGGING').length,
  );

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__wordmark">trackify</span>
      </div>

      <nav className="sidebar__nav" aria-label="Main">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `sidebar__item${isActive ? ' sidebar__item--active' : ''}`}
            onClick={() => haptics.impactLight()}
          >
            <span className="sidebar__icon">{item.icon}</span>
            <span className="sidebar__label">{item.longLabel ?? item.label}</span>
            {item.to === '/feed' && needsTagging > 0 ? (
              <span className="sidebar__count" aria-label={`${needsTagging} need tagging`}>
                {needsTagging}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        {recurring && recurring.items.length > 0 ? (
          <div className="sidebar__stat">
            <span className="sidebar__stat-label">RECURRING</span>
            <span className="sidebar__stat-value">{money(recurring.monthlyTotalCents)}/mo</span>
          </div>
        ) : null}
        <div className="sidebar__account">
          <span className="sidebar__account-name">{me?.displayName ?? 'Signed in'}</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
