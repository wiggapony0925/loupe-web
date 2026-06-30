/**
 * MarketplaceRail — renders one `RailSpec` from the catalog. A thin dispatcher
 * picks a kind-specific component so each leaf calls exactly one data hook
 * unconditionally (stable hook order), and every rail self-hides when its slice
 * is too thin. Add a rail by editing railCatalog.ts — never here.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layers } from "lucide-react";
import {
  usePublicTrending,
  usePublicBrowse,
  usePublicSets,
  type CardSet,
} from "@loupe/core";
import { Carousel, ShopCard, ShopCardSkeleton, Skeleton } from "@/components";
import { SealedRail } from "../SealedRail/SealedRail";
import { applyLens } from "./cardFilters";
import type { RailSpec } from "./railCatalog";
import styles from "./GameMarketplace.module.scss";

export function MarketplaceRail({
  game,
  label,
  spec,
  onCard,
}: {
  game: string;
  label: string;
  spec: RailSpec;
  onCard: (id: string) => void;
}) {
  switch (spec.kind) {
    case "cards":
      return <CardMarketRail game={game} spec={spec} onCard={onCard} />;
    case "catalog":
      return <CatalogMarketRail game={game} spec={spec} onCard={onCard} />;
    case "sets":
      return <SetMarketRail game={game} spec={spec} />;
    case "sealed":
      return (
        <SealedRail
          tcg={game}
          label={label}
          productType={spec.productType}
          title={spec.title}
          subtitle={spec.subtitle}
          minItems={spec.minItems ?? 1}
        />
      );
  }
}

/** A card rail: fetch a server slice, apply the spec's client lens, self-hide. */
function CardMarketRail({
  game,
  spec,
  onCard,
}: {
  game: string;
  spec: Extract<RailSpec, { kind: "cards" }>;
  onCard: (id: string) => void;
}) {
  const { data, isLoading } = usePublicTrending({
    tcg: game,
    sort: spec.fetch.sort,
    maxPrice: spec.fetch.maxPrice,
    limit: spec.fetch.limit,
  });
  // The trending endpoint used to intermittently return [] (an uncached
  // upstream-miss the rail couldn't distinguish from "genuinely empty"). That's
  // fixed backend-side with a last-good fallback, so no client retry is needed:
  // an empty slice here means the game truly has none → self-hide.
  const cards = applyLens(data ?? [], spec.lens ?? {});
  if (!isLoading && cards.length < (spec.minItems ?? 1)) return null;
  return (
    <Carousel title={spec.title} subtitle={spec.subtitle}>
      {isLoading
        ? Array.from({ length: 8 }).map((_, i) => <ShopCardSkeleton key={i} />)
        : cards.map((c) => (
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

/** A catalog-sourced card rail (browse endpoint) — gives catalog-only games a
 *  real card carousel even when the price/trending feeds are empty. */
function CatalogMarketRail({
  game,
  spec,
  onCard,
}: {
  game: string;
  spec: Extract<RailSpec, { kind: "catalog" }>;
  onCard: (id: string) => void;
}) {
  const { data, isLoading } = usePublicBrowse({
    game,
    page: 1,
    pageSize: spec.limit ?? 20,
    sort: spec.sort ?? "newest",
  });
  const cards = data?.results ?? [];
  if (!isLoading && cards.length < (spec.minItems ?? 1)) return null;
  return (
    <Carousel title={spec.title} subtitle={spec.subtitle}>
      {isLoading
        ? Array.from({ length: 8 }).map((_, i) => <ShopCardSkeleton key={i} />)
        : cards.map((c) => (
            <ShopCard
              key={c.id}
              imageUrl={c.imageUrl}
              title={c.name}
              subtitle={c.setName}
              price={c.price ?? c.low}
              tag={c.rarity}
              onClick={() => onCard(c.id)}
            />
          ))}
    </Carousel>
  );
}

/** "Shop <game> sets" — newest-first set tiles that drill into a set's cards. */
function SetMarketRail({
  game,
  spec,
}: {
  game: string;
  spec: Extract<RailSpec, { kind: "sets" }>;
}) {
  const navigate = useNavigate();
  const { data: sets, isLoading } = usePublicSets(game);
  // Newest sets first (collectors care most about recent releases), capped to a
  // rail-sized slice — the full list lives in the Sets explorer via "See all".
  const ordered = [...(sets ?? [])]
    .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""))
    .slice(0, 20);
  if (!isLoading && ordered.length < (spec.minItems ?? 1)) return null;
  return (
    <Carousel
      title={spec.title}
      subtitle={spec.subtitle}
      itemWidth="200px"
      action={
        <Link to="/sets" className={styles.setSeeAll}>
          See all
        </Link>
      }
    >
      {isLoading
        ? Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={172} radius={14} />
          ))
        : ordered.map((s) => (
            <SetTile
              key={s.id}
              set={s}
              onClick={() =>
                navigate(
                  `/cards?game=${encodeURIComponent(game)}&set=${encodeURIComponent(s.id)}`,
                )
              }
            />
          ))}
    </Carousel>
  );
}

/** Short set code from a set name, e.g. "BT-04: Booster…" → "BT-04",
 *  "OP02 …" → "OP02". Null when the name has no code prefix. */
function setCode(name: string): string | null {
  const code = name.match(/^([A-Za-z]{1,4}[-\s]?\d{1,3}[A-Za-z]?)/)?.[1];
  return code ? code.toUpperCase().replace(/\s+/, "-") : null;
}

function SetTile({ set, onClick }: { set: CardSet; onClick: () => void }) {
  const [imgOk, setImgOk] = useState(Boolean(set.imageUrl));
  const yr = /(\d{4})/.exec(set.releaseDate ?? "")?.[1] ?? null;
  const code = setCode(set.name);
  return (
    <button type="button" className={styles.setTile} onClick={onClick}>
      <span className={styles.setLogo}>
        {set.imageUrl && imgOk ? (
          <img
            src={set.imageUrl}
            alt={set.name}
            loading="lazy"
            onError={() => setImgOk(false)}
          />
        ) : code ? (
          // No logo from the provider (Digimon/One Piece) — show the set code as
          // a branded symbol instead of a generic icon that reads as "broken".
          <span className={styles.setCode}>{code}</span>
        ) : (
          <Layers size={28} className={styles.setLogoFallback} />
        )}
      </span>
      <span className={styles.setName}>{set.name}</span>
      <span className={styles.setMeta}>
        {[set.totalCards ? `${set.totalCards} cards` : null, yr]
          .filter(Boolean)
          .join(" · ") || "Set"}
      </span>
    </button>
  );
}
