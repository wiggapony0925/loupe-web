import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense, type ComponentType, type ReactElement } from "react";
import { RequireAuth } from "@/auth/RequireAuth";
import { FeatureGate } from "@/components";
import { NotFound } from "@/features/misc/NotFound/NotFound";
import { RouteError } from "@/routes/RouteError";
import { EmbeddedGuard } from "@/routes/EmbeddedGuard";

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

/** sessionStorage flag so a stale-chunk reload happens at most once per tab. */
const RELOAD_KEY = "loupe.chunk-reload";

/**
 * Lazy-load a named export, resilient to chunk-load failures.
 *
 * A dynamic `import()` rejects (not throws-on-render) only when the chunk
 * itself fails to fetch — almost always a **stale chunk after a deploy** (the
 * cached `index.html` references hashes that now 404), or a transient network
 * blip. Instead of bubbling to the "something happened" error page, we retry
 * once, then reload ONE time to pull the fresh `index.html` + chunk map. Real
 * render errors don't reach here (they throw during render → error boundary).
 */
function el(loader: () => Promise<unknown>, name: string): ReactElement {
  const load = async () => {
    const m = (await loader()) as Record<string, ComponentType>;
    return { default: m[name] as ComponentType };
  };
  const C = lazy(async () => {
    try {
      const mod = await load();
      try {
        sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        /* private mode — ignore */
      }
      return mod;
    } catch {
      // One quick in-place retry for a transient fetch hiccup.
      await new Promise((r) => setTimeout(r, 350));
      try {
        const mod = await load();
        try {
          sessionStorage.removeItem(RELOAD_KEY);
        } catch {
          /* ignore */
        }
        return mod;
      } catch (err) {
        let reloaded = false;
        try {
          reloaded = Boolean(sessionStorage.getItem(RELOAD_KEY));
          if (!reloaded) sessionStorage.setItem(RELOAD_KEY, "1");
        } catch {
          /* ignore storage failures */
        }
        if (!reloaded && typeof window !== "undefined") {
          window.location.reload();
          // Hang until the reload swaps the document so the error page never
          // flashes.
          return new Promise<never>(() => {});
        }
        throw err; // already reloaded once → surface the genuine failure
      }
    }
  });
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
  cardScanner: () => import("@/features/scan/CardScanner/CardScanner"),
  login: () => import("@/features/auth/Login/Login"),
  signup: () => import("@/features/auth/Signup/Signup"),
  publicLayout: () => import("@/features/public/PublicLayout/PublicLayout"),
  browse: () => import("@/features/public/Browse/Browse"),
  sealed: () => import("@/features/public/Sealed/Sealed"),
  sealedDetail: () =>
    import("@/features/public/SealedDetail/SealedDetail"),
  loupeGrade: () => import("@/features/public/LoupeGrade/LoupeGrade"),
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
    // of React Router's default unstyled error page. EmbeddedGuard renders the
    // child <Outlet/> but confines navigation to /admin when the app is loaded
    // inside the mobile dev-portal WebView.
    element: <EmbeddedGuard />,
    errorElement: <RouteError />,
    children: [
  { path: "/", element: el(M.landing, "MarketingLanding") },
  { path: "/login", element: el(M.login, "Login") },
  { path: "/signup", element: el(M.signup, "Signup") },
  // Full-screen workspace — deliberately outside PublicLayout (no nav/footer
  // chrome), edge-to-edge like a Figma canvas.
  { path: "/grade", element: el(M.loupeGrade, "LoupeGrade") },
  // Full-screen in-browser card scanner (camera + photo upload).
  { path: "/scan", element: el(M.cardScanner, "CardScanner") },
  {
    element: el(M.publicLayout, "PublicLayout"),
    children: [
      { path: "cards", element: el(M.browse, "Browse") },
      { path: "cards/:id", element: el(M.product, "ProductDetail") },
      { path: "sealed", element: el(M.sealed, "Sealed") },
      { path: "sealed/:id", element: el(M.sealedDetail, "SealedDetail") },
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
      { path: "pro", element: el(M.admin, "AdminPro") },
      { path: "announce", element: el(M.admin, "AdminAnnounce") },
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
