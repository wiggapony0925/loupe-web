import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { appEmbedScopes, isEmbedded, isPathInScope } from "@/lib/embedded";

/**
 * Root route element that confines navigation when the app is bundled inside a
 * native WebView. The native side blocks *hard* loads, but react-router `<Link>`
 * taps are client-side (`pushState`) navigations it can't see — so the web side
 * enforces the same confinement here:
 *
 *   • Dev portal (`?embed=admin`) → locked to the /admin section.
 *   • User-facing embed (`?embed=app&scope=…`) → locked to the scopes the
 *     native screen passed (e.g. `/help,/legal,/blog`). Any in-content link out
 *     of scope bounces back to the embed's home (the first scope).
 *
 * Outside a WebView it's a transparent pass-through.
 */
export function EmbeddedGuard() {
  const location = useLocation();
  const navigate = useNavigate();

  const adminOffLimits = isEmbedded() && !location.pathname.startsWith("/admin");

  const appScopes = appEmbedScopes();
  const appOffLimits =
    appScopes !== null && !isPathInScope(location.pathname, appScopes);

  const offLimits = adminOffLimits || appOffLimits;
  // Where to bounce: /admin for the portal, else the app embed's home scope.
  const home = adminOffLimits ? "/admin" : (appScopes?.[0] ?? "/");

  useEffect(() => {
    if (offLimits) void navigate(home, { replace: true });
  }, [offLimits, home, navigate]);

  // Render nothing for an off-limits route so its content never flashes before
  // the redirect lands.
  if (offLimits) return null;
  return <Outlet />;
}
