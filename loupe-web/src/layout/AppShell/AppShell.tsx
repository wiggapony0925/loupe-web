import { Outlet } from "react-router-dom";
import { Sidebar } from "../Sidebar/Sidebar";
import { BottomTabBar } from "../BottomTabBar/BottomTabBar";
import { TopBar } from "../TopBar/TopBar";
import { ScrollToTop } from "@/components";
import { useUiStore } from "@/stores/uiStore";
import { cx } from "@/lib/cx";
import styles from "./AppShell.module.scss";

/** Responsive application frame:
 *  • desktop (≥lg) → full left rail   • tablet (md–lg) → icon rail
 *  • phone (<md)   → bottom tab bar (the rail hides itself via CSS). */
export function AppShell() {
  const side = useUiStore((s) => s.sidebarSide);
  return (
    <div className={cx(styles.shell, side === "right" && styles.shellRight)}>
      <ScrollToTop />
      <Sidebar />
      <div className={styles.main}>
        <TopBar />
        <main className={styles.content} data-scroll-root>
          <div className={styles.container}>
            <Outlet />
          </div>
        </main>
      </div>
      <BottomTabBar />
    </div>
  );
}
