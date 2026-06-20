import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets scroll to the top on every route change.
 *
 * React Router keeps the previous scroll position across navigations, so
 * clicking a card from a scrolled list would drop you mid-page (often at the
 * footer). We reset both the window and any marked scroll container
 * (`[data-scroll-root]` — the app shell + public layout main elements), and
 * skip in-page hash links (e.g. `#device`) so anchor navigation still works.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return; // let the browser jump to the anchor
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.querySelectorAll<HTMLElement>("[data-scroll-root]").forEach((el) => {
      el.scrollTop = 0;
    });
  }, [pathname, hash]);

  return null;
}
