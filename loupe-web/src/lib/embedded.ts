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
