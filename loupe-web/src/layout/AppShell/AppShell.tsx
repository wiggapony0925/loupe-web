import { Outlet } from "react-router-dom";
import { Sidebar } from "../Sidebar/Sidebar";
import { TopBar } from "../TopBar/TopBar";
import { Banner, ScrollToTop } from "@/components";
import { useUiStore } from "@/stores/uiStore";
import { cx } from "@/lib/cx";
import styles from "./AppShell.module.scss";

/** Responsive application frame:
 *  • desktop (≥lg) → full left rail   • tablet (md–lg) → icon rail
 *  • phone (<md)   → the rail hides; the TopBar hosts a hamburger that opens
 *    the nav as a slide-in drawer (from the user's chosen side). */
export function AppShell() {
  const side = useUiStore((s) => s.sidebarSide);
  return (
    <div className={cx(styles.shell, side === "right" && styles.shellRight)}>
      <ScrollToTop />
      <Sidebar />
      <div className={styles.main}>
        <TopBar />
        {/* Global notices (errors, offline, announcements) sit directly under
            the navbar — in-flow, full main-column width. */}
        <Banner />
        <main className={styles.content} data-scroll-root>
          <div className={styles.container}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
