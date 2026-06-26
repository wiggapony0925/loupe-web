import { buildGameRails } from "./railCatalog";
import { MarketplaceRail } from "./MarketplaceRail";

const GAME_LABELS: Record<string, string> = {
  pokemon: "Pokémon",
  magic: "Magic",
  yugioh: "Yu-Gi-Oh!",
};

/**
 * Per-game marketplace — a storefront of game-scoped discovery carousels above
 * the full catalog grid. The set of rails is fully data-driven by the rail
 * catalog (railCatalog.ts): we just map the catalog into self-hiding
 * MarketplaceRails, so every supported game gets the same rich, organized
 * storefront and adding a new rail is a one-line catalog edit. Rails whose slice
 * is empty for a game simply don't render.
 */
export function GameMarketplace({
  game,
  onCard,
}: {
  game: string;
  onCard: (id: string) => void;
}) {
  const label = GAME_LABELS[game] ?? "cards";
  const rails = buildGameRails(label);
  return (
    <>
      {rails.map((spec) => (
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
