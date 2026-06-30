import { useMemo, useState } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import {
  Briefcase,
  FileText,
  Inbox,
  LayoutDashboard,
  Users,
  ToggleRight,
  Smartphone,
  ScanLine,
  ArrowLeft,
  Sparkles,
  Megaphone,
  Search,
  Menu,
  X,
  KeyRound,
  Activity,
  Database,
  Cloud,
  ScrollText,
  LineChart,
  Grid3x3,
  Library,
  Radio,
  ShieldCheck,
  TerminalSquare,
  Network,
  Plug,
  type LucideIcon,
} from "lucide-react";
import { useAdminFlags } from "@loupe/core";
import { Logo } from "@/assets";
import { ThemeToggle, ScrollToTop, Avatar } from "@/components";
import { NotFound } from "@/features/misc/NotFound/NotFound";
import { useAuth } from "@/auth/AuthProvider";
import { useUiStore } from "@/stores/uiStore";
import { isEmbedded } from "@/lib/embedded";
import { cx } from "@/lib/cx";
import { ADMIN_PAGES, ADMIN_GROUP_ORDER } from "@/features/admin/adminPages";
import styles from "./AdminLayout.module.scss";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Optional one-word hint shown under the label when searching. */
  hint?: string;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Per-page icons, keyed by the page's path in the {@link ADMIN_PAGES} registry.
 * The registry (shared with the router) owns labels/groups/flags; icons live
 * here next to the nav that renders them.
 */
const ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  health: Activity,
  database: Database,
  cloud: Cloud,
  env: KeyRound,
  integrations: Plug,
  audit: ScrollText,
  revenue: LineChart,
  pro: Sparkles,
  announce: Megaphone,
  flags: ToggleRight,
  users: Users,
  catalog: Library,
  cards: Search,
  "card-tree": Network,
  grades: ShieldCheck,
  scanner: ScanLine,
  pulse: Radio,
  engagement: LineChart,
  retention: Grid3x3,
  jobs: Briefcase,
  applications: Inbox,
  blog: FileText,
  waitlist: ScanLine,
  insights: Sparkles,
  api: Network,
  console: TerminalSquare,
  simulator: Smartphone,
  navkeys: KeyRound,
};
const FALLBACK_ICON = ToggleRight;

/**
 * Developer-portal shell. Access is admin-only and deliberately invisible:
 * guests and non-admins get a 404 (the route looks like it doesn't exist),
 * never a login prompt or "access denied" — so its existence isn't leaked.
 * The backend independently enforces the same on every API call.
 */
export function AdminLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const side = useUiStore((s) => s.sidebarSide);
  // Admin-portal flags come from the admin-only endpoint (they're withheld from
  // the public flag map), keyed for O(1) lookup.
  const { data: adminFlags } = useAdminFlags();
  const flagMap = useMemo(
    () => Object.fromEntries((adminFlags ?? []).map((f) => [f.key, f.enabled])),
    [adminFlags],
  );
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState(false); // mobile off-canvas

  // Build the grouped nav from the shared ADMIN_PAGES registry: hide any page
  // whose flag is explicitly disabled, then apply the search filter, then drop
  // empty groups. Core pages (no flag) are always shown.
  const groups: NavGroup[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = ADMIN_PAGES.filter((p) => {
      if (p.flag && flagMap[p.flag] === false) return false;
      if (!q) return true;
      return p.label.toLowerCase().includes(q) || p.hint.toLowerCase().includes(q);
    });
    return ADMIN_GROUP_ORDER.map((label) => ({
      label,
      items: visible
        .filter((p) => p.group === label)
        .map((p) => ({
          to: `/admin/${p.path}`,
          label: p.label,
          hint: p.hint,
          icon: ICONS[p.path] ?? FALLBACK_ICON,
        })),
    })).filter((g) => g.items.length > 0);
  }, [query, flagMap]);

  if (loading) return null; // hydrating — avoid a 404 flash for a real admin
  if (!user || !user.is_admin) return <NotFound />;

  const name = user.display_name || user.email.split("@")[0] || "Admin";

  return (
    <div className={cx(styles.shell, side === "right" && styles["shell--right"])}>
      <ScrollToTop />

      {/* Mobile top bar — the sidebar collapses behind a menu button. */}
      <header className={cx(styles.topbar, side === "right" && styles["topbar--right"])}>
        <button
          type="button"
          className={styles.topbar__menu}
          onClick={() => setDrawer(true)}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className={styles.brand}>
          <span className={styles.brand__mark}>
            <Logo size={20} showWordmark={false} />
          </span>
          <span className={styles.brand__name}>Developer Portal</span>
        </div>
        <ThemeToggle compact />
      </header>

      {/* Scrim behind the mobile drawer. */}
      {drawer && <div className={styles.scrim} onClick={() => setDrawer(false)} aria-hidden />}

      <aside
        className={cx(
          styles.sidebar,
          side === "right" && styles["sidebar--right"],
          drawer && styles["sidebar--open"],
        )}
      >
        <div className={styles.sidebar__head}>
          <Link to="/admin/overview" className={styles.brand} onClick={() => setDrawer(false)}>
            <span className={styles.brand__mark}>
              <Logo size={20} showWordmark={false} />
            </span>
            <span className={styles.brand__text}>
              <span className={styles.brand__name}>Loupe</span>
              <span className={styles.brand__eyebrow}>Developer Portal</span>
            </span>
          </Link>
          <button
            type="button"
            className={styles.sidebar__close}
            onClick={() => setDrawer(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.search}
            type="search"
            placeholder="Search the portal…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search admin pages"
          />
        </div>

        <nav className={styles.nav} aria-label="Admin">
          {groups.length === 0 && <p className={styles.navEmpty}>No pages match “{query}”.</p>}
          {groups.map((group) => (
            <div key={group.label} className={styles.navGroup}>
              <span className={styles.navGroup__label}>{group.label}</span>
              {group.items.map(({ to, label, icon: Icon, hint }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setDrawer(false)}
                  className={({ isActive }) => cx(styles.link, isActive && styles["link--active"])}
                >
                  <Icon size={17} className={styles.link__icon} />
                  <span className={styles.link__body}>
                    <span className={styles.link__label}>{label}</span>
                    {query.trim() && hint && <span className={styles.link__hint}>{hint}</span>}
                  </span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className={styles.sidebar__foot}>
          {/* Hidden in the mobile WebView (embedded mode) — the bundled portal
              must stay dev-only, with no escape into the rest of the app. */}
          {!isEmbedded() && (
            <Link to="/app" className={styles.backToApp}>
              <ArrowLeft size={15} /> Back to app
            </Link>
          )}
          <div className={styles.userCard}>
            <Avatar name={name} src={user.avatar_url ?? undefined} size="sm" />
            <span className={styles.userCard__meta}>
              <span className={styles.userCard__name}>{name}</span>
              <span className={styles.userCard__email}>{user.email}</span>
            </span>
            <ThemeToggle compact />
          </div>
        </div>
      </aside>

      <main className={styles.main} data-scroll-root key={location.pathname}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
