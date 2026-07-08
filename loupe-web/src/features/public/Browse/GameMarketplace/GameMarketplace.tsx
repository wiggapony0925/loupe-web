import { useEffect, useMemo, useState } from "react";
import { Shuffle, Sparkles } from "lucide-react";
import { usePublicCarousels } from "@loupe/core";
import { composeGameRails } from "./carouselRecipes";
import { MarketplaceRail } from "./MarketplaceRail";
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
 * The shelves aren't a fixed list: a momentum anchor leads, then a
 * **seed-shuffled sample of a strategy pool** (see carouselRecipes), bookended
 * by catalog + sets + sealed anchors — so the storefront varies every visit
 * like a real marketplace instead of showing the same rails forever. Every
 * shelf self-hides when its slice is thin, so the same engine serves a
 * data-rich game and a catalog-only one. The Shuffle button rerolls the mix.
 */
export function GameMarketplace({
  game,
  onCard,
}: {
  game: string;
  onCard: (id: string) => void;
}) {
  const label = GAME_LABELS[game] ?? "cards";

  // Fresh shuffle per game + per visit; the Shuffle button rerolls on demand.
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  useEffect(() => {
    setSeed(Math.floor(Math.random() * 2 ** 31));
  }, [game]);

  // The backend owns the recipe pool: `/v1/public/carousels` returns the
  // curated pool, upgraded to AI shelves (cached daily) when a model is
  // configured. `carousels` is `undefined` until it answers — the rail engine
  // then falls back to its local pool only for that cold-load window so the
  // storefront is never bare. This is the single source of truth mobile shares.
  const { data: carousels } = usePublicCarousels(game);
  const recipes = carousels?.carousels;
  const aiOn = carousels?.source === "ai" && (recipes?.length ?? 0) > 0;

  const rails = useMemo(
    () => composeGameRails(label, seed, { recipes }),
    [label, seed, recipes],
  );

  return (
    <>
      <div className={styles.toolbar}>
        {aiOn && (
          <span className={styles.aiBadge}>
            <Sparkles size={13} /> AI-curated
          </span>
        )}
        <button
          type="button"
          className={styles.shuffle}
          onClick={() => setSeed(Math.floor(Math.random() * 2 ** 31))}
        >
          <Shuffle size={15} /> Shuffle carousels
        </button>
      </div>
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
