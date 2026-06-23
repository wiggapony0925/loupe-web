import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { isEmbedded } from "@/lib/embedded";

/**
 * Root route element. When the app runs inside the mobile dev-portal WebView
 * (embedded mode), it confines navigation to the /admin section — any route
 * outside /admin is bounced straight back, so the bundled portal can only ever
 * show dev pages. Outside embedded mode it's a transparent pass-through.
 */
export function EmbeddedGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const offLimits = isEmbedded() && !location.pathname.startsWith("/admin");

  useEffect(() => {
    if (offLimits) navigate("/admin", { replace: true });
  }, [offLimits, navigate]);

  // Render nothing for an off-limits route so its content never flashes before
  // the redirect lands.
  if (offLimits) return null;
  return <Outlet />;
}
