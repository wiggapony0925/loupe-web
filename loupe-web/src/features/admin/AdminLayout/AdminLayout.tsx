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
  Library,
  Radio,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/assets";
import { ThemeToggle, ScrollToTop, Avatar } from "@/components";
import { NotFound } from "@/features/misc/NotFound/NotFound";
import { useAuth } from "@/auth/AuthProvider";
import { isEmbedded } from "@/lib/embedded";
import { cx } from "@/lib/cx";
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
 * Grouped sidebar nav. Every destination is visible at a glance under a labelled
 * section — no more hunting through an overflowing tab bar for "Announce".
 */
const NAV: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { to: "/admin/overview", label: "Overview", icon: LayoutDashboard, hint: "Dashboard" },
      { to: "/admin/health", label: "System health", icon: Activity, hint: "Live status" },
      { to: "/admin/database", label: "Database", icon: Database, hint: "Schema & rows" },
      { to: "/admin/cloud", label: "Google Cloud", icon: Cloud, hint: "Run & SQL" },
      { to: "/admin/audit", label: "Audit log", icon: ScrollText, hint: "Activity trail" },
    ],
  },
  {
    label: "Monetization",
    items: [
      { to: "/admin/revenue", label: "Revenue", icon: LineChart, hint: "MRR & churn" },
      { to: "/admin/pro", label: "Loupe Pro", icon: Sparkles, hint: "Plans & gates" },
      { to: "/admin/announce", label: "Announcements", icon: Megaphone, hint: "Banner to all users" },
      { to: "/admin/flags", label: "Feature flags", icon: ToggleRight, hint: "Toggle micro-apps" },
    ],
  },
  {
    label: "People",
    items: [{ to: "/admin/users", label: "Users", icon: Users, hint: "Search, roles, bans" }],
  },
  {
    label: "Catalog & product",
    items: [
      { to: "/admin/catalog", label: "Catalog", icon: Library, hint: "Coverage by game" },
      { to: "/admin/cards", label: "Card data", icon: Search, hint: "Explore & override" },
      { to: "/admin/scanner", label: "Scanner", icon: ScanLine, hint: "Identify funnel" },
    ],
  },
  {
    label: "Growth",
    items: [
      { to: "/admin/pulse", label: "Live pulse", icon: Radio, hint: "Activity feed" },
    ],
  },
  {
    label: "Content & hiring",
    items: [
      { to: "/admin/jobs", label: "Jobs", icon: Briefcase, hint: "Open roles" },
      { to: "/admin/applications", label: "Applications", icon: Inbox, hint: "Inbound" },
      { to: "/admin/blog", label: "Blog", icon: FileText, hint: "Posts" },
      { to: "/admin/waitlist", label: "Scanner waitlist", icon: ScanLine, hint: "Hardware" },
    ],
  },
  {
    label: "Tools",
    items: [
      { to: "/admin/simulator", label: "Device simulator", icon: Smartphone, hint: "Preview" },
      { to: "/admin/navkeys", label: "Nav keys", icon: KeyRound, hint: "Sign-in deep links" },
    ],
  },
];

/**
 * Developer-portal shell. Access is admin-only and deliberately invisible:
 * guests and non-admins get a 404 (the route looks like it doesn't exist),
 * never a login prompt or "access denied" — so its existence isn't leaked.
 * The backend independently enforces the same on every API call.
 */
export function AdminLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState(false); // mobile off-canvas

  // Filter nav by the search box; drop groups that end up empty.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV;
    return NAV.map((g) => ({
      ...g,
      items: g.items.filter(
        (i) => i.label.toLowerCase().includes(q) || i.hint?.toLowerCase().includes(q),
      ),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  if (loading) return null; // hydrating — avoid a 404 flash for a real admin
  if (!user || !user.is_admin) return <NotFound />;

  const name = user.display_name || user.email.split("@")[0] || "Admin";

  return (
    <div className={styles.shell}>
      <ScrollToTop />

      {/* Mobile top bar — the sidebar collapses behind a menu button. */}
      <header className={styles.topbar}>
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

      <aside className={cx(styles.sidebar, drawer && styles["sidebar--open"])}>
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
