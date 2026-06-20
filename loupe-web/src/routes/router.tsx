import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/layout/AppShell";
import { RequireAuth } from "@/auth/RequireAuth";
import { PublicLayout } from "@/features/public/PublicLayout/PublicLayout";
import { Browse } from "@/features/public/Browse/Browse";
import { ProductDetail } from "@/features/public/ProductDetail/ProductDetail";
import { MarketingLanding } from "@/features/marketing/MarketingLanding/MarketingLanding";
import { Scanner } from "@/features/marketing/Scanner/Scanner";
import { Login } from "@/features/auth/Login/Login";
import { Signup } from "@/features/auth/Signup/Signup";
import { CommandCenter } from "@/features/commandCenter/CommandCenter/CommandCenter";
import { Vault } from "@/features/vault/Vault/Vault";
import { Markets } from "@/features/markets/Markets/Markets";
import { Analytics } from "@/features/analytics/Analytics/Analytics";
import { Watchlist } from "@/features/watchlist/Watchlist/Watchlist";
import { Settings } from "@/features/settings/Settings/Settings";
import { About, Careers, ApplicationTrack, Press, Help, Status, Contact, Legal } from "@/features/site";
import { Blog, BlogPost } from "@/features/blog";
import { AdminLayout, AdminOverview, AdminUsers, AdminJobs, AdminApplications, AdminBlog, AdminFlags, AdminSimulator, AdminWaitlist } from "@/features/admin";
import { FeatureGate } from "@/components";
import { NotFound } from "@/features/misc/NotFound/NotFound";

/**
 * Routes:
 *  - Public marketing + storefront (search/product) — no login.
 *  - Auth screens.
 *  - The authenticated app under /app.
 */
export const router = createBrowserRouter([
  { path: "/", element: <MarketingLanding /> },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
  {
    element: <PublicLayout />,
    children: [
      { path: "cards", element: <Browse /> },
      { path: "cards/:id", element: <ProductDetail /> },
      // Hardware — the Loupe Scanner product page + waitlist checkout.
      { path: "scanner", element: <Scanner /> },
      // Company / resources / legal — informational pages in the public frame.
      { path: "about", element: <About /> },
      { path: "careers", element: <Careers /> },
      { path: "careers/track", element: <ApplicationTrack /> },
      { path: "press", element: <Press /> },
      { path: "blog", element: <Blog /> },
      { path: "blog/:slug", element: <BlogPost /> },
      { path: "help", element: <Help /> },
      { path: "status", element: <Status /> },
      { path: "contact", element: <Contact /> },
      { path: "legal/:doc", element: <Legal /> },
    ],
  },
  {
    path: "/app",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <CommandCenter /> },
      { path: "vault", element: <Vault /> },
      { path: "discover", element: <Navigate to="/app/markets" replace /> },
      { path: "markets", element: <FeatureGate flag="web_markets" fallback={<NotFound />}><Markets /></FeatureGate> },
      { path: "analytics", element: <FeatureGate flag="web_analytics" fallback={<NotFound />}><Analytics /></FeatureGate> },
      { path: "watchlist", element: <FeatureGate flag="web_watchlist" fallback={<NotFound />}><Watchlist /></FeatureGate> },
      { path: "settings", element: <Settings /> },
    ],
  },
  {
    // No RequireAuth: AdminLayout 404s guests + non-admins so the portal's
    // existence isn't leaked (a login redirect would reveal the route).
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/admin/overview" replace /> },
      { path: "overview", element: <AdminOverview /> },
      { path: "users", element: <AdminUsers /> },
      { path: "flags", element: <AdminFlags /> },
      { path: "simulator", element: <AdminSimulator /> },
      { path: "jobs", element: <AdminJobs /> },
      { path: "applications", element: <AdminApplications /> },
      { path: "blog", element: <AdminBlog /> },
      { path: "waitlist", element: <AdminWaitlist /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
