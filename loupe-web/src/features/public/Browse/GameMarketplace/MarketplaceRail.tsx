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
  type ResolvedRail,
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

/**
 * A rail whose cards were ALREADY resolved by the backend
 * (`/v1/public/carousels/resolved`). No fetch, no client lens, no self-hide —
 * the backend dropped empty rails, so this just paints the cards. Both web and
 * mobile render from the same resolved payload → identical carousels.
 */
export function ResolvedRailView({
  rail,
  onCard,
}: {
  rail: ResolvedRail;
  onCard: (id: string) => void;
}) {
  return (
    <Carousel title={rail.title} subtitle={rail.subtitle}>
      {rail.cards.map((c) => (
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

/** "Newest <game> sets" — newest-first set tiles that drill into a set's cards. */
function SetMarketRail({
  game,
  spec,
}: {
  game: string;
  spec: Extract<RailSpec, { kind: "sets" }>;
}) {
  const navigate = useNavigate();
  // Ordering is backend-defined (`sort=newest`); the local sort below only
  // covers older backends that ignore the param — against a current one it's
  // a no-op. Capped to a rail-sized slice; the full list lives in the Sets
  // explorer via "See all".
  const { data: sets, isLoading } = usePublicSets(game, true, "newest");
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

/** "2024/11/08" or "2024-11-08" → "Nov 2024" — on a newest-first rail the
 *  month is what makes recency legible, not just the year. */
function releaseLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const [y, m] = raw.replace(/\//g, "-").split("-").map(Number);
  if (!y) return null;
  if (!m || m < 1 || m > 12) return String(y);
  const month = new Date(Date.UTC(y, m - 1)).toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  return `${month} ${y}`;
}

function SetTile({ set, onClick }: { set: CardSet; onClick: () => void }) {
  const [imgOk, setImgOk] = useState(Boolean(set.imageUrl));
  const released = releaseLabel(set.releaseDate);
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
        {[released, set.totalCards ? `${set.totalCards} cards` : null]
          .filter(Boolean)
          .join(" · ") || "Set"}
      </span>
    </button>
  );
}
