/**
 * Human-readable rarity labels.
 *
 * Catalog-only games (Digimon, One Piece) hand back cryptic single/short codes
 * with inconsistent casing — `"U"`, `"u"`, `"p"`, `"SR"` — which read like
 * broken data in a tile. Map the common codes to words and title-case anything
 * that's already a phrase (Pokémon's `"RARE RAINBOW"` → `"Rare Rainbow"`).
 */
const RARITY_LABELS: Record<string, string> = {
  c: "Common",
  u: "Uncommon",
  uc: "Uncommon",
  r: "Rare",
  sr: "Super Rare",
  ssr: "Secret Rare",
  sec: "Secret Rare",
  pr: "Promo",
  p: "Promo",
  l: "Leader",
  aa: "Alt Art",
  spr: "Special Rare",
};

export function rarityLabel(rarity?: string | null): string {
  if (!rarity) return "";
  const key = rarity.trim().toLowerCase();
  if (RARITY_LABELS[key]) return RARITY_LABELS[key];
  // Already a word/phrase — title-case it (also fixes ALL-CAPS upstream values).
  return rarity
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
