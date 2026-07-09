import { Sparkles } from "lucide-react";
import { usePublicCarouselsResolved } from "@loupe/core";
import { MarketplaceRail, ResolvedRailView } from "./MarketplaceRail";
import { ShopCardSkeleton } from "@/components";
import type { RailSpec } from "./railCatalog";
import styles from "./GameMarketplace.module.scss";

const GAME_LABELS: Record<string, string> = {
  pokemon: "Pokémon",
  magic: "Magic",
  yugioh: "Yu-Gi-Oh!",
  digimon: "Digimon",
  onepiece: "One Piece",
};

/**
 * Per-game marketplace — a storefront of game-scoped discovery carousels above
 * the full catalog grid.
 *
 * The carousels are **backend-resolved**: `/v1/public/carousels/resolved`
 * returns the exact rails to show, each already filled with cards (a trending
 * anchor + curated/AI value & rarity rails + an explore rail), with empty rails
 * dropped server-side. The web just paints them — the same payload mobile
 * renders — so the marketplace shows the identical carousels everywhere with
 * zero client-side filtering. Two structural rails the resolver doesn't own
 * (Shop sets, Sealed products — different data) close the storefront.
 */
export function GameMarketplace({
  game,
  onCard,
}: {
  game: string;
  onCard: (id: string) => void;
}) {
  const label = GAME_LABELS[game] ?? "cards";

  const { data: resolved, isLoading } = usePublicCarouselsResolved(game);
  const rails = resolved?.rails ?? [];
  const aiOn = resolved?.source === "ai" && rails.length > 0;

  // Structural rails the resolver doesn't produce (they're not card lists);
  // rendered through the existing rail engine after the resolved card rails.
  const structural: RailSpec[] = [
    {
      kind: "sets",
      id: "sets",
      title: `Shop ${label} sets`,
      subtitle: `Browse ${label} by set — every release, with live card counts.`,
      minItems: 1,
    },
    {
      kind: "sealed",
      id: "sealed",
      title: `Sealed ${label} products`,
      subtitle: "Booster boxes, ETBs, and bundles — tracked like singles.",
      minItems: 1,
    },
  ];

  return (
    <>
      {aiOn && (
        <div className={styles.toolbar}>
          <span className={styles.aiBadge}>
            <Sparkles size={13} /> AI-curated
          </span>
        </div>
      )}
      {isLoading ? (
        <div style={{ display: "flex", gap: 12, overflow: "hidden" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <ShopCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        rails.map((rail) => (
          <ResolvedRailView key={rail.id} rail={rail} onCard={onCard} />
        ))
      )}
      {structural.map((spec) => (
        <MarketplaceRail
          key={spec.id}
          game={game}
          label={label}
          spec={spec}
          onCard={onCard}
        />
      ))}
    </>
  );
}
