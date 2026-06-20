import { usePublicTrending, type CardSummary } from "@loupe/core";
import { Carousel } from "@/components/Carousel/Carousel";
import { ShopCard } from "@/components/ShopCard/ShopCard";
import { Skeleton } from "@/components/Skeleton/Skeleton";

/** Games surfaced as their own "Best from …" value rails. */
const GAMES = [
  { label: "Pokémon", tcg: "pokemon" },
  { label: "Magic", tcg: "magic" },
  { label: "Yu-Gi-Oh!", tcg: "yugioh" },
] as const;

/**
 * "Best from <game>" carousels — one live, value-sorted rail per TCG, reusing
 * the same Carousel + ShopCard as the landing page. Shared by Browse + Markets
 * so the discovery surface stays consistent. Each rail self-hides when empty.
 */
export function GameRails({ onCard }: { onCard: (id: string) => void }) {
  return (
    <>
      {GAMES.map((g) => (
        <GameRail key={g.tcg} tcg={g.tcg} label={g.label} onCard={onCard} />
      ))}
    </>
  );
}

function GameRail({
  tcg,
  label,
  onCard,
}: {
  tcg: string;
  label: string;
  onCard: (id: string) => void;
}) {
  const { data, isLoading } = usePublicTrending({
    tcg,
    sort: "value",
    limit: 20,
  });
  if (!isLoading && (data?.length ?? 0) === 0) return null;
  return (
    <Carousel
      title={`Best from ${label}`}
      subtitle={`Top ${label} cards by live market value.`}
    >
      {isLoading
        ? Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={300} radius={14} />
          ))
        : (data ?? []).map((c: CardSummary) => (
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
