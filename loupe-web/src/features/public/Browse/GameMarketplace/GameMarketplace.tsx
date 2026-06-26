import { usePublicTrending, type CardSummary } from "@loupe/core";
import { Carousel } from "@/components/Carousel/Carousel";
import { ShopCard } from "@/components/ShopCard/ShopCard";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { SealedRail } from "../SealedRail/SealedRail";

const GAME_LABELS: Record<string, string> = {
  pokemon: "Pokémon",
  magic: "Magic",
  yugioh: "Yu-Gi-Oh!",
};

/**
 * Per-game marketplace — when a user picks a game (`/cards?game=pokemon`) we
 * surface several game-scoped discovery carousels (trending, most valuable,
 * steals, sealed) before the full catalog grid, so each game reads like its own
 * storefront instead of a flat list. Mirrors the cross-game GameRails + SealedRail
 * on the landing, but every rail is filtered to the selected `game`. Each rail
 * self-hides when its slice is empty (e.g. Magic/Yu-Gi-Oh! sealed coverage).
 */
export function GameMarketplace({
  game,
  onCard,
}: {
  game: string;
  onCard: (id: string) => void;
}) {
  const label = GAME_LABELS[game] ?? "cards";
  return (
    <>
      <CardRail
        title={`Trending in ${label}`}
        subtitle={`The ${label} cards moving most across connected marketplaces right now.`}
        tcg={game}
        sort="trending"
        onCard={onCard}
      />
      <CardRail
        title={`Most valuable ${label}`}
        subtitle={`The priciest ${label} cards in today's live market.`}
        tcg={game}
        sort="value"
        onCard={onCard}
      />
      <CardRail
        title="Steals under $5"
        subtitle={`Affordable ${label} pickups, priced live.`}
        tcg={game}
        sort="trending"
        maxPrice={5}
        minItems={4}
        onCard={onCard}
      />
      <SealedRail tcg={game} label={label} />
    </>
  );
}

/** One value/trending rail, scoped to a game. Self-hides below `minItems`. */
function CardRail({
  title,
  subtitle,
  tcg,
  sort,
  maxPrice,
  minItems = 1,
  onCard,
}: {
  title: string;
  subtitle: string;
  tcg: string;
  sort: "trending" | "value";
  maxPrice?: number;
  minItems?: number;
  onCard: (id: string) => void;
}) {
  const { data, isLoading } = usePublicTrending({ tcg, sort, maxPrice, limit: 20 });
  const items = data ?? [];
  if (!isLoading && items.length < minItems) return null;
  return (
    <Carousel title={title} subtitle={subtitle}>
      {isLoading
        ? Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={300} radius={14} />
          ))
        : items.map((c: CardSummary) => (
            <ShopCard
              key={c.id}
              imageUrl={c.imageUrl}
              title={c.name}
              subtitle={c.setName}
              price={c.price}
              tag={c.rarity}
              onClick={() => onCard(c.id)}
            />
          ))}
    </Carousel>
  );
}
