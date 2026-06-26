import { NavLink } from "react-router-dom";
import { LogOut, ShieldCheck } from "lucide-react";
import { usePublicFlags } from "@loupe/core";
import { NavDrawer } from "@/components/NavDrawer/NavDrawer";
import { ThemeToggle } from "@/components";
import { cx } from "@/lib/cx";
import { useUiStore } from "@/stores/uiStore";
import { useAuth } from "@/auth/AuthProvider";
import { FOOTER_NAV, PRIMARY_NAV, type NavItem } from "../nav";
import drawer from "./AppNavDrawer.module.scss";

const ADMIN_NAV: NavItem = {
  to: "/admin",
  label: "Developer Portal",
  icon: ShieldCheck,
};

/**
 * Phone navigation for the signed-in app shell — a hamburger that opens the
 * full nav as a slide-in drawer (the desktop rail hides on phones). Opens from
 * the user's chosen side so the "Sidebar position" setting is honoured on
 * mobile too, not just desktop. Only visible below `md`; tablet portrait keeps
 * the compact icon rail.
 */
export function AppNavDrawer({ triggerClassName }: { triggerClassName?: string }) {
  const side = useUiStore((s) => s.sidebarSide);
  const { user, logout } = useAuth();
  const { data: flags } = usePublicFlags();
  const primaryNav = PRIMARY_NAV.filter(
    (item) => !item.flag || (flags?.[item.flag] ?? true),
  );

  return (
    <NavDrawer side={side} triggerBreakpoint="md" triggerClassName={triggerClassName}>
      {(close) => (
        <div className={drawer.body}>
          <nav className={drawer.nav}>
            {primaryNav.map((item) => (
              <DrawerLink key={item.to} item={item} onNavigate={close} />
            ))}
          </nav>

          <div className={drawer.footer}>
            {user?.is_admin && <DrawerLink item={ADMIN_NAV} onNavigate={close} />}
            {FOOTER_NAV.map((item) => (
              <DrawerLink key={item.to} item={item} onNavigate={close} />
            ))}

            <div className={drawer.tools}>
              <ThemeToggle />
            </div>

            <button
              type="button"
              className={drawer.signout}
              onClick={() => {
                close();
                logout();
              }}
            >
              <LogOut size={18} /> Sign out
            </button>
          </div>
        </div>
      )}
    </NavDrawer>
  );
}

function DrawerLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate: () => void;
}) {
  const { to, label, icon: Icon, end } = item;
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => cx(drawer.item, isActive && drawer.active)}
    >
      <Icon className={drawer.icon} />
      <span className={drawer.label}>{label}</span>
    </NavLink>
  );
}
