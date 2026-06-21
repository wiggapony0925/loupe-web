import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { lazy, Suspense, type ComponentType, type ReactElement } from "react";
import { RequireAuth } from "@/auth/RequireAuth";
import { FeatureGate } from "@/components";
import { NotFound } from "@/features/misc/NotFound/NotFound";
import { RouteError } from "@/routes/RouteError";

/**
 * Routes are code-split: each page (and the admin/site/blog bundles) loads on
 * demand so the initial download is the shell + the route you landed on, not
 * the whole app. Small wrappers (RequireAuth, FeatureGate, NotFound) stay eager
 * since they gate routing itself.
 */
function RouteFallback() {
  return (
    <div className="route-fallback" aria-busy="true" aria-label="Loading" />
  );
}

/** Lazy-load a named export from a module behind a Suspense boundary. */
function el(loader: () => Promise<unknown>, name: string): ReactElement {
  const C = lazy(() =>
    loader().then((m) => ({
      default: (m as Record<string, ComponentType>)[name] as ComponentType,
    })),
  );
  return (
    <Suspense fallback={<RouteFallback />}>
      <C />
    </Suspense>
  );
}

const M = {
  landing: () =>
    import("@/features/marketing/MarketingLanding/MarketingLanding"),
  scanner: () => import("@/features/marketing/Scanner/Scanner"),
  login: () => import("@/features/auth/Login/Login"),
  signup: () => import("@/features/auth/Signup/Signup"),
  publicLayout: () => import("@/features/public/PublicLayout/PublicLayout"),
  browse: () => import("@/features/public/Browse/Browse"),
  sealed: () => import("@/features/public/Sealed/Sealed"),
  setsExplorer: () => import("@/features/public/Sets/Sets"),
  product: () => import("@/features/public/ProductDetail/ProductDetail"),
  appShell: () => import("@/layout/AppShell/AppShell"),
  commandCenter: () =>
    import("@/features/commandCenter/CommandCenter/CommandCenter"),
  vault: () => import("@/features/vault/Vault/Vault"),
  markets: () => import("@/features/markets/Markets/Markets"),
  analytics: () => import("@/features/analytics/Analytics/Analytics"),
  statements: () => import("@/features/statements/Statements/Statements"),
  watchlist: () => import("@/features/watchlist/Watchlist/Watchlist"),
  settings: () => import("@/features/settings/Settings/Settings"),
  site: () => import("@/features/site"),
  blog: () => import("@/features/blog"),
  admin: () => import("@/features/admin"),
} as const;

export const router = createBrowserRouter([
  {
    // Pathless root: a render/load error in ANY route bubbles here and shows the
    // branded recovery screen (keeps the URL, offers reload / go-home) instead
    // of React Router's default unstyled error page.
    element: <Outlet />,
    errorElement: <RouteError />,
    children: [
  { path: "/", element: el(M.landing, "MarketingLanding") },
  { path: "/login", element: el(M.login, "Login") },
  { path: "/signup", element: el(M.signup, "Signup") },
  {
    element: el(M.publicLayout, "PublicLayout"),
    children: [
      { path: "cards", element: el(M.browse, "Browse") },
      { path: "cards/:id", element: el(M.product, "ProductDetail") },
      { path: "sealed", element: el(M.sealed, "Sealed") },
      { path: "sets", element: el(M.setsExplorer, "Sets") },
      { path: "scanner", element: el(M.scanner, "Scanner") },
      { path: "about", element: el(M.site, "About") },
      { path: "careers", element: el(M.site, "Careers") },
      { path: "careers/track", element: el(M.site, "ApplicationTrack") },
      { path: "press", element: el(M.site, "Press") },
      { path: "blog", element: el(M.blog, "Blog") },
      { path: "blog/:slug", element: el(M.blog, "BlogPost") },
      { path: "help", element: el(M.site, "Help") },
      { path: "status", element: el(M.site, "Status") },
      { path: "contact", element: el(M.site, "Contact") },
      { path: "legal/:doc", element: el(M.site, "Legal") },
    ],
  },
  {
    path: "/app",
    element: <RequireAuth>{el(M.appShell, "AppShell")}</RequireAuth>,
    children: [
      { index: true, element: el(M.commandCenter, "CommandCenter") },
      { path: "vault", element: el(M.vault, "Vault") },
      { path: "discover", element: <Navigate to="/app/markets" replace /> },
      {
        path: "markets",
        element: (
          <FeatureGate flag="web_markets" fallback={<NotFound />}>
            {el(M.markets, "Markets")}
          </FeatureGate>
        ),
      },
      {
        path: "analytics",
        element: (
          <FeatureGate flag="web_analytics" fallback={<NotFound />}>
            {el(M.analytics, "Analytics")}
          </FeatureGate>
        ),
      },
      {
        path: "watchlist",
        element: (
          <FeatureGate flag="web_watchlist" fallback={<NotFound />}>
            {el(M.watchlist, "Watchlist")}
          </FeatureGate>
        ),
      },
      { path: "statements", element: el(M.statements, "Statements") },
      { path: "settings", element: el(M.settings, "Settings") },
    ],
  },
  {
    // No RequireAuth: AdminLayout 404s guests + non-admins so the portal's
    // existence isn't leaked (a login redirect would reveal the route).
    path: "/admin",
    element: el(M.admin, "AdminLayout"),
    children: [
      { index: true, element: <Navigate to="/admin/overview" replace /> },
      { path: "overview", element: el(M.admin, "AdminOverview") },
      { path: "users", element: el(M.admin, "AdminUsers") },
      { path: "flags", element: el(M.admin, "AdminFlags") },
      { path: "simulator", element: el(M.admin, "AdminSimulator") },
      { path: "jobs", element: el(M.admin, "AdminJobs") },
      { path: "applications", element: el(M.admin, "AdminApplications") },
      { path: "blog", element: el(M.admin, "AdminBlog") },
      { path: "waitlist", element: el(M.admin, "AdminWaitlist") },
    ],
  },
  { path: "*", element: <NotFound /> },
    ],
  },
]);
