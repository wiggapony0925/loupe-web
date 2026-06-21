import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ShieldCheck,
} from "lucide-react";
import { usePublicFlags } from "@loupe/core";
import { cx } from "@/lib/cx";
import { useUiStore } from "@/stores/uiStore";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useAuth } from "@/auth/AuthProvider";
import { Logo } from "@/assets";
import { Tooltip } from "@/components/Tooltip/Tooltip";
import { FOOTER_NAV, PRIMARY_NAV, type NavItem } from "../nav";
import styles from "./Sidebar.module.scss";

/** Developer-portal entry — only rendered for admin users. */
const ADMIN_NAV: NavItem = {
  to: "/admin",
  label: "Developer Portal",
  short: "Portal",
  icon: ShieldCheck,
};

/** Navigation rail — collapsible, left/right, persisted, with active-route highlighting.
 *  Auto-collapses to the icon rail below `lg` (tablet/phone) so content keeps room. */
export function Sidebar() {
  const stored = useUiStore((s) => s.sidebarCollapsed);
  const side = useUiStore((s) => s.sidebarSide);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const { user } = useAuth();
  const { data: flags } = usePublicFlags();
  // Hide nav items whose feature flag is off (unknown flags stay visible).
  const primaryNav = PRIMARY_NAV.filter(
    (item) => !item.flag || (flags?.[item.flag] ?? true),
  );
  // Below the `lg` breakpoint (iPad portrait & phones) the rail is always compact.
  const compact = useMediaQuery("(max-width: 1023.98px)");
  // Hover-to-peek: a manually-collapsed rail expands while hovered (desktop
  // only — touch/tablet has no hover and keeps the static icon rail).
  const [hovered, setHovered] = useState(false);
  const hoverExpand = stored && !compact && hovered;
  const collapsed = (stored || compact) && !hoverExpand;
  const tipSide = side === "right" ? "left" : "right";

  // Collapse glyph points "inward" toward content; expand glyph points back out.
  const CollapseIcon = side === "right" ? PanelRightClose : PanelLeftClose;
  const ExpandIcon = side === "right" ? PanelRightOpen : PanelLeftOpen;

  return (
    <aside
      className={cx(
        styles.sidebar,
        collapsed && styles.collapsed,
        hoverExpand && styles.hoverExpand,
        side === "right" && styles.right,
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={styles.brand}>
        <Logo size={24} showWordmark={!collapsed} />
      </div>

      <nav className={styles.nav}>
        {primaryNav.map((item) => (
          <NavItemLink
            key={item.to}
            item={item}
            collapsed={collapsed}
            tipSide={tipSide}
          />
        ))}
      </nav>

      <div className={styles.footer}>
        {user?.is_admin && (
          <NavItemLink
            item={ADMIN_NAV}
            collapsed={collapsed}
            tipSide={tipSide}
          />
        )}
        {FOOTER_NAV.map((item) => (
          <NavItemLink
            key={item.to}
            item={item}
            collapsed={collapsed}
            tipSide={tipSide}
          />
        ))}
        {!compact && (
          <Tooltip content={stored ? "Expand" : "Collapse"} side={tipSide}>
            <button
              className={styles.collapseBtn}
              onClick={() => {
                // Clear the hover-peek so a collapse takes effect immediately
                // even though the cursor is still over the rail (otherwise
                // hoverExpand would keep it open and the button looks dead).
                setHovered(false);
                toggle();
              }}
              aria-label="Toggle sidebar"
            >
              {stored ? <ExpandIcon /> : <CollapseIcon />}
              {!stored && <span>Collapse</span>}
            </button>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}

/** A single nav row — wrapped in a tooltip when the rail is collapsed. */
function NavItemLink({
  item,
  collapsed,
  tipSide,
}: {
  item: NavItem;
  collapsed: boolean;
  tipSide: "left" | "right";
}) {
  const { to, label, icon: Icon, end } = item;
  const link = (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => cx(styles.item, isActive && styles.active)}
    >
      <Icon className={styles.icon} />
      {!collapsed && <span className={styles.label}>{label}</span>}
    </NavLink>
  );
  return collapsed ? (
    <Tooltip content={label} side={tipSide}>
      {link}
    </Tooltip>
  ) : (
    link
  );
}
