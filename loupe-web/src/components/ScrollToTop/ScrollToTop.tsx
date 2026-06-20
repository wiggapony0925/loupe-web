import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Take scroll control away from the browser's bfcache/history restore — on
// iOS Safari it otherwise re-applies the *previous* page's scroll position
// after our reset, landing you mid-page (often at the footer).
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

function resetScroll() {
  window.scrollTo(0, 0);
  // Some engines scroll the documentElement, others the body.
  if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  document.querySelectorAll<HTMLElement>("[data-scroll-root]").forEach((el) => {
    el.scrollTop = 0;
  });
}

/**
 * Resets scroll to the top on every route change.
 *
 * React Router keeps the previous scroll position across navigations, so
 * clicking a card from a scrolled list would drop you mid-page (often at the
 * footer). We reset the window + any marked scroll container
 * (`[data-scroll-root]`), and skip in-page hash links (e.g. `#device`).
 *
 * iOS Safari applies its scroll *after* React's effect runs and after late
 * layout shifts (images decoding, fonts), so a single synchronous reset gets
 * overridden. We reset immediately, then again on the next two animation
 * frames, to win that race.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return; // let the browser jump to the anchor
    resetScroll();
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      resetScroll();
      r2 = requestAnimationFrame(resetScroll);
    });
    return () => {
      cancelAnimationFrame(r1);
      if (r2) cancelAnimationFrame(r2);
    };
  }, [pathname, hash]);

  return null;
}
