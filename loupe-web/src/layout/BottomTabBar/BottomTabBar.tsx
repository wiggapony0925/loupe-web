import { NavLink } from "react-router-dom";
import { cx } from "@/lib/cx";
import { PRIMARY_NAV } from "../nav";
import styles from "./BottomTabBar.module.scss";

/** Phone-only navigation — a fixed bottom tab bar that mirrors the native app.
 *  Rendered for every viewport but only made visible below `md` via CSS, so the
 *  desktop/tablet rail and this bar never show at the same time. */
export function BottomTabBar() {
  return (
    <nav className={styles.bar} aria-label="Primary">
      {PRIMARY_NAV.map(({ to, label, short, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => cx(styles.tab, isActive && styles.active)}
        >
          <Icon className={styles.icon} />
          <span className={styles.label}>{short ?? label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
