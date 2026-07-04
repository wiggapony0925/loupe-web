import { NavLink, useNavigate } from "react-router-dom";
import { ScanLine } from "lucide-react";
import { usePublicFlags } from "@loupe/core";
import { PRIMARY_NAV } from "../nav";
import { cx } from "@/lib/cx";
import styles from "./MobileTabBar.module.scss";

/** Tabs flanking the scan action — two per side. */
const SIDE_TABS = 4;

/**
 * Phone bottom tab bar — the thumb-first way around the app, with the
 * product's core action (scan) as a raised center button, camera-app style.
 * Tabs derive from the same {@link PRIMARY_NAV} registry as the sidebar
 * (flag-aware), so the two can't drift.
 */
export function MobileTabBar() {
  const navigate = useNavigate();
  const { data: flags } = usePublicFlags();
  const items = PRIMARY_NAV.filter(
    (item) => !item.flag || (flags?.[item.flag] ?? true),
  ).slice(0, SIDE_TABS);
  const left = items.slice(0, 2);
  const right = items.slice(2, 4);

  const tab = ({ to, label, short, icon: Icon, end }: (typeof items)[number]) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      viewTransition
      className={({ isActive }) => cx(styles.tab, isActive && styles.active)}
    >
      <Icon size={21} aria-hidden />
      <span className={styles.label}>{short ?? label}</span>
    </NavLink>
  );

  return (
    <nav className={styles.bar} aria-label="Primary">
      {left.map(tab)}
      <button
        type="button"
        className={styles.scan}
        aria-label="Scan a card"
        onClick={() => navigate("/scan", { viewTransition: true })}
      >
        <ScanLine size={24} aria-hidden />
      </button>
      {right.map(tab)}
    </nav>
  );
}
