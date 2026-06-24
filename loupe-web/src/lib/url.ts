/**
 * Off-site marketplace / third-party listing hosts. Links to these get a
 * "you're leaving Loupe" interstitial (see useLoupeNavigation) — our own pages and
 * known-safe links navigate silently.
 */
const MARKETPLACE_HOSTS = [
  "ebay.",
  "tcgplayer.",
  "pricecharting.",
  "cardmarket.",
  "mercari.",
  "facebook.",
  "whatnot.",
  "comc.",
  "pwccmarketplace.",
  "goldin.",
  "stockx.",
  "amazon.",
  "trollandtoad.",
];

/** True when `href` carries a URI scheme (http:, mailto:, tel:…) rather than an
 *  in-app route path like `/cards/123`. */
export function hasScheme(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href);
}

/** True when `href` points off the current origin. */
export function isExternalUrl(href: string): boolean {
  if (typeof window === "undefined") return hasScheme(href);
  try {
    return new URL(href, window.location.origin).origin !== window.location.origin;
  } catch {
    return false;
  }
}

/** True when `href` is an off-site marketplace/listing (→ show the interstitial). */
export function isMarketplaceUrl(href: string): boolean {
  if (!isExternalUrl(href)) return false;
  try {
    const host = new URL(href, window.location.origin).hostname.toLowerCase();
    return MARKETPLACE_HOSTS.some((m) => host.includes(m));
  } catch {
    return false;
  }
}
