import { NavLink, Outlet, Link } from "react-router-dom";
import { Briefcase, FileText, Inbox, LayoutDashboard, Users, ToggleRight, Smartphone, ScanLine, ArrowLeft } from "lucide-react";
import { Logo } from "@/assets";
import { ThemeToggle, ScrollToTop } from "@/components";
import { NotFound } from "@/features/misc/NotFound/NotFound";
import { useAuth } from "@/auth/AuthProvider";
import { cx } from "@/lib/cx";
import styles from "./AdminLayout.module.scss";

const TABS = [
  { to: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/flags", label: "Flags", icon: ToggleRight },
  { to: "/admin/simulator", label: "Simulator", icon: Smartphone },
  { to: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { to: "/admin/applications", label: "Applications", icon: Inbox },
  { to: "/admin/blog", label: "Blog", icon: FileText },
  { to: "/admin/waitlist", label: "Waitlist", icon: ScanLine },
];

/**
 * Developer-portal shell. Access is admin-only and deliberately invisible:
 * guests and non-admins get a 404 (the route looks like it doesn't exist),
 * never a login prompt or "access denied" — so its existence isn't leaked.
 * The backend independently enforces the same on every API call.
 */
export function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) return null; // hydrating — avoid a 404 flash for a real admin
  if (!user || !user.is_admin) return <NotFound />;

  return (
    <div className={styles.portal}>
      <ScrollToTop />
      <header className={styles.bar}>
        <div className={styles.bar__brand}>
          <Logo size={24} />
          <span className={styles.bar__title}>Developer Portal</span>
        </div>
        <nav className={styles.tabs}>
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cx(styles.tab, isActive && styles["tab--active"])}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.bar__right}>
          <ThemeToggle compact />
          <Link to="/app" className={styles.bar__back}>
            <ArrowLeft size={15} /> App
          </Link>
        </div>
      </header>

      <main className={styles.main} data-scroll-root>
        <Outlet />
      </main>
    </div>
  );
}
