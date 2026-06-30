import { getApiConfig } from "@loupe/core";

/**
 * Card-image CDNs that send a restrictive `Cross-Origin-Resource-Policy`
 * response header. The One Piece official CDN (`*.onepiece-cardgame.com`) sends
 * `Cross-Origin-Resource-Policy: same-site`, so browsers refuse to embed its
 * images cross-origin — the request dies with
 * `net::ERR_BLOCKED_BY_RESPONSE.NotSameSite` and the <img> never paints.
 *
 * For just those hosts we route the image through our own same-origin image
 * proxy (`/v1/img`), which fetches the bytes server-side (CORP is a
 * browser-only policy, not enforced server→server) and re-emits them from our
 * origin without the restrictive header. Well-behaved CDNs (Pokémon, Scryfall,
 * YGOPRODeck, Digimon) send no such header and load directly, so we leave them
 * untouched to avoid paying egress for images that already work.
 *
 * The backend image proxy keeps a matching host allowlist — see
 * `app/routers/catalog/image_proxy.py::_ALLOWED_HOSTS`. Adding a host here
 * means adding it there too, or the proxy returns 400.
 */
const PROXY_HOST_SUFFIXES: readonly string[] = ["onepiece-cardgame.com"];

function needsProxy(host: string): boolean {
  return PROXY_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
}

/**
 * Resolve a card / set / product image URL to a browser-loadable `src`,
 * routing CORP-restricted hosts through our same-origin proxy. Safe to call on
 * any value: empty, relative, `data:`, or already-proxied URLs are returned
 * unchanged.
 */
export function cardImageSrc(url: string | null | undefined): string {
  if (!url) return "";
  let host: string;
  try {
    host = new URL(url, window.location.origin).hostname.toLowerCase();
  } catch {
    return url; // not an absolute URL (data:, relative, blob:) — use as-is
  }
  if (!needsProxy(host)) return url;
  const base = getApiConfig().baseUrl.replace(/\/$/, "");
  return `${base}/v1/img?u=${encodeURIComponent(url)}`;
}
