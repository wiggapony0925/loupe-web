import type { ScanCandidate } from "@loupe/core";

/**
 * Derive a card's art URL from its identify id when the backend candidate
 * didn't carry one (text / pHash matches frequently don't). Mirrors the mobile
 * viewfinder so the web scanners show real card images instead of blank tiles.
 * The id looks like `pokemontcg:base1-58` / `ygoprodeck:12345` / `scryfall:uuid`.
 */
export function candidateArt(c: ScanCandidate): string {
  if (c.imageUrl) return c.imageUrl;
  const raw = c.id ?? "";
  const colon = raw.indexOf(":");
  const provider = (colon > 0 ? raw.slice(0, colon) : (c.tcg ?? "")).toLowerCase();
  const ext = colon >= 0 ? raw.slice(colon + 1) : raw;
  if (!ext) return "";
  if (provider.includes("pokemon")) {
    const dash = ext.indexOf("-");
    if (dash > 0) {
      const set = ext.slice(0, dash);
      const num = ext.slice(dash + 1);
      return `https://images.pokemontcg.io/${encodeURIComponent(set)}/${encodeURIComponent(num)}.png`;
    }
  }
  if (provider.includes("yugioh") || provider.includes("ygo")) {
    return `https://images.ygoprodeck.com/images/cards/${encodeURIComponent(ext)}.jpg`;
  }
  if (provider.includes("magic") || provider.includes("scryfall")) {
    return `https://api.scryfall.com/cards/${encodeURIComponent(ext)}?format=image&version=small`;
  }
  return "";
}
