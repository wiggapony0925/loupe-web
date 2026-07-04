import { Outlet } from "react-router-dom";
import { Sidebar } from "../Sidebar/Sidebar";
import { TopBar } from "../TopBar/TopBar";
import { MobileTabBar } from "../MobileTabBar/MobileTabBar";
import { Banner, ScrollToTop } from "@/components";
import { useUiStore } from "@/stores/uiStore";
import { isAppEmbedded } from "@/lib/embedded";
import { cx } from "@/lib/cx";
import styles from "./AppShell.module.scss";

/** Responsive application frame:
 *  • desktop (≥lg) → full left rail   • tablet (md–lg) → icon rail
 *  • phone (<md)   → the rail hides; a bottom tab bar carries the primary
 *    destinations and the TopBar hamburger opens the full nav drawer. */
export function AppShell() {
  const side = useUiStore((s) => s.sidebarSide);
  // Bundled inside the native app: the app provides chrome (header, tab
  // bar), so render only the page content, edge-to-edge.
  if (isAppEmbedded()) {
    return (
      <main className={styles.embedded} data-scroll-root>
        <ScrollToTop />
        <Banner />
        <Outlet />
      </main>
    );
  }
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
      <MobileTabBar />
    </div>
  );
}
