import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePublicSearch, type CardSummary } from "@loupe/core";
import { Carousel } from "@/components/Carousel/Carousel";
import { ShopCard } from "@/components/ShopCard/ShopCard";

interface RelatedPrintsProps {
  cardId: string;
  cardName: string;
}

/**
 * Best-effort game from the composite card id (e.g. "pokemontcg:base1-4").
 * Keeps the "other prints" search in the same TCG; falls back to all games
 * (undefined) for sources we don't recognise.
 */
function gameFromId(id: string): string | undefined {
  const src = id.split(":")[0]?.toLowerCase() ?? "";
  if (src.includes("pokemon")) return "pokemon";
  if (src.includes("scryfall") || src.includes("mtg") || src.includes("magic"))
    return "magic";
  if (src.includes("ygo") || src.includes("yugioh")) return "yugioh";
  return undefined;
}

/**
 * "Other prints" rail — a horizontal carousel of cards that share this card's
 * name root (e.g. every "Charizard ex" across sets/years), so a visitor can hop
 * between alternate printings without leaving the page. Mirrors the mobile
 * app's `RelatedCardsRail`: search by the leading name tokens, drop the current
 * card, and reuse the same Carousel + ShopCard as Browse. Self-hides when there
 * are no other prints.
 */
export function RelatedPrints({ cardId, cardName }: RelatedPrintsProps) {
  const navigate = useNavigate();
  const tcg = useMemo(() => gameFromId(cardId), [cardId]);

  // First 1–2 tokens of the name (parentheticals stripped) — a tight match that
  // catches alternate sets without pulling in unrelated cards.
  const q = useMemo(() => {
    const cleaned = cardName.replace(/\(.*?\)/g, "").trim();
    return cleaned.split(/\s+/).slice(0, 2).join(" ");
  }, [cardName]);

  const { data, isLoading } = usePublicSearch(
    { q, tcg: tcg || undefined, pageSize: 12 },
    q.length >= 2,
  );

  const results: CardSummary[] = useMemo(
    () => (data?.results ?? []).filter((c) => c.id !== cardId).slice(0, 10),
    [data, cardId],
  );

  // Nothing to show (and not still loading) → render nothing.
  if (q.length < 2) return null;
  if (!isLoading && results.length === 0) return null;

  return (
    <Carousel
      title="Other prints"
      subtitle="The same card across other sets and printings."
    >
      {isLoading && results.length === 0
        ? null
        : results.map((c) => (
            <ShopCard
              key={c.id}
              imageUrl={c.imageUrl}
              title={c.name}
              subtitle={c.setName}
              price={c.price}
              tag={c.rarity}
              onClick={() =>
                navigate(`/cards/${encodeURIComponent(c.id)}`)
              }
            />
          ))}
    </Carousel>
  );
}
