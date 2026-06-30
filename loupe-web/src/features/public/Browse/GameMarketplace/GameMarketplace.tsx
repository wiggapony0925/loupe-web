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

  // AI-authored shelves (cached daily server-side); falls back to curated-only
  // when the model isn't configured — the rail engine doesn't care where a
  // recipe came from, so this just enriches the rotating pool.
  const { data: ai } = usePublicCarousels(game);
  const aiRecipes = ai?.carousels;
  const aiOn = ai?.source === "ai" && (aiRecipes?.length ?? 0) > 0;

  const rails = useMemo(
    () => composeGameRails(label, seed, { aiRecipes }),
    [label, seed, aiRecipes],
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
