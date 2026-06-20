import { RouterProvider } from "react-router-dom";
import { AppProviders } from "@/providers/AppProviders";
import { Banner, InspectOverlay } from "@/components";
import { router } from "@/routes/router";

/** App root — provider stack wrapping the router, with the global notice banner
 *  and the admin-only Figma-style inspect overlay. */
export default function App() {
  return (
    <AppProviders>
      <Banner />
      <RouterProvider router={router} />
      <InspectOverlay />
    </AppProviders>
  );
}
