/**
 * Embedded mode — true when the web app is running inside the mobile
 * developer-portal WebView (it loads `${webUrl}/admin?embed=admin` and seeds a
 * sessionStorage flag before the page boots). We persist the URL param into
 * sessionStorage so the flag survives client-side navigation.
 *
 * Used to lock the embedded portal to the /admin section: hide the escape
 * links and bounce any attempt to reach the rest of the app back to /admin
 * (see `EmbeddedGuard`). The mobile WebView additionally blocks hard
 * navigations, so the two layers together keep the portal dev-only.
 */
const KEY = "loupe.embed";

/** The embed scope (e.g. "admin"), or null when not embedded. */
export function embedScope(): string | null {
  try {
    const param = new URLSearchParams(window.location.search).get("embed");
    if (param) {
      window.sessionStorage.setItem(KEY, param);
      return param;
    }
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** True when embedded as the admin/dev portal. */
export function isEmbedded(): boolean {
  return embedScope() === "admin";
}

/**
 * True when a user-facing page is bundled inside the native app
 * (`?embed=app`) — the app brings its own chrome, so the web shell hides
 * the TopBar / tab bar / sidebar / public header+footer and renders the
 * page content edge-to-edge (the YouTube-in-app pattern).
 */
export function isAppEmbedded(): boolean {
  return embedScope() === "app";
}

const SCOPE_KEY = "loupe.embed.scope";

/**
 * The path prefixes an app-embed is confined to (`?scope=/help,/legal,…`), or
 * null when not app-embedded or no scope was supplied.
 *
 * The native WebView passes the same confine list it uses to block hard
 * navigations; we persist it into sessionStorage (like the embed flag) so it
 * survives client-side SPA navigation — the mobile guard can't see those, so
 * the web side enforces them (see `EmbeddedGuard`).
 */
export function appEmbedScopes(): string[] | null {
  if (!isAppEmbedded()) return null;
  try {
    const param = new URLSearchParams(window.location.search).get("scope");
    if (param) {
      window.sessionStorage.setItem(SCOPE_KEY, param);
    }
    const raw = param ?? window.sessionStorage.getItem(SCOPE_KEY);
    if (!raw) return null;
    const scopes = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return scopes.length ? scopes : null;
  } catch {
    return null;
  }
}

/** True when `pathname` falls within one of the embed's allowed scopes. */
export function isPathInScope(pathname: string, scopes: string[]): boolean {
  return scopes.some((s) => pathname === s || pathname.startsWith(`${s}/`));
}
