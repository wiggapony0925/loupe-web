import { RouterProvider } from "react-router-dom";
import { AppProviders } from "@/providers/AppProviders";
import { AnnouncementHost, Banner, ErrorBoundary, InspectOverlay } from "@/components";
import { router } from "@/routes/router";

/** App root — provider stack wrapping the router, with the global notice banner
 *  and the admin-only Figma-style inspect overlay. The ErrorBoundary is the
 *  outermost layer so a render crash anywhere shows the themed fallback instead
 *  of a white screen. */
export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <Banner />
        <AnnouncementHost />
        <RouterProvider router={router} />
        <InspectOverlay />
      </AppProviders>
    </ErrorBoundary>
  );
}
