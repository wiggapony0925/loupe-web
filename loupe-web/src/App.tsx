import { RouterProvider } from "react-router-dom";
import { AppProviders } from "@/providers/AppProviders";
import { AnnouncementHost, ErrorBoundary, InspectOverlay } from "@/components";
import { router } from "@/routes/router";
import { useRecentsSync } from "@/hooks/useRecentsSync";

/** Cross-device sync for the recents store — null render, just the effect. */
function RecentsSync() {
  useRecentsSync();
  return null;
}

/** App root — provider stack wrapping the router, with the global notice banner
 *  and the admin-only Figma-style inspect overlay. The ErrorBoundary is the
 *  outermost layer so a render crash anywhere shows the themed fallback instead
 *  of a white screen. */
export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <RecentsSync />
        {/* The poller pushes the admin announcement into the notice store; the
            visible <Banner /> now lives under each layout's navbar (AppShell,
            PublicLayout, MarketingLanding). */}
        <AnnouncementHost />
        <RouterProvider router={router} />
        <InspectOverlay />
      </AppProviders>
    </ErrorBoundary>
  );
}
