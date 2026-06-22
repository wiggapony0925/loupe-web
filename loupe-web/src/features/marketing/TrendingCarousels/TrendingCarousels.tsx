import { Link, useNavigate } from "react-router-dom";
import {
  usePublicTrending,
  usePublicSealedSearch,
  type CardSummary,
  type SealedProduct,
} from "@loupe/core";
import { Carousel, ShopCard, Skeleton } from "@/components";
import { useMixedTrending } from "@/hooks/useMixedTrending";
import { SealedCard } from "@/features/public/Sealed/SealedCard/SealedCard";
import styles from "./TrendingCarousels.module.scss";

/** Live carousels — a balanced Pokémon · Magic · Yu-Gi-Oh! mix (interleaved). */
export function TrendingCarousels() {
  const navigate = useNavigate();
  const trending = useMixedTrending("trending");
  const valuable = useMixedTrending("value");
  const steals = usePublicTrending({ maxPrice: 5, limit: 20 });
  const sealed = usePublicSealedSearch({ limit: 20 });

  const go = (c: CardSummary) => navigate(`/cards/${encodeURIComponent(c.id)}`);

  const tiles = (rows: CardSummary[] | undefined, loading: boolean) =>
    loading
      ? Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={300} radius={14} />
        ))
      : (rows ?? []).map((c) => (
          <ShopCard
            key={c.id}
            imageUrl={c.imageUrl}
            title={c.name}
            subtitle={c.setName}
            price={c.price}
            tag={c.rarity}
            onClick={() => go(c)}
          />
        ));

  const sealedTiles = (rows: SealedProduct[] | undefined, loading: boolean) =>
    loading
      ? Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={300} radius={14} />
        ))
      : (rows ?? []).map((p) => (
          <SealedCard
            key={p.id}
            product={p}
            owned={false}
          />
        ));

  const seeAll = (
    <Link to="/cards" className={styles.trending__seeall}>
      See all
    </Link>
  );

  const seeAllSealed = (
    <Link to="/sealed" className={styles.trending__seeall}>
      See all
    </Link>
  );

  return (
    <div id="trending" className={styles.trending}>
      <Carousel
        title="Trending now"
        live
        subtitle="The cards moving most across connected marketplaces — open any one for its full interactive price history."
        animation={true}
        action={seeAll}
      >
        {tiles(trending.data, trending.isLoading)}
      </Carousel>

      <Carousel
        title="Most valuable right now"
        subtitle="The priciest cards in today's live market."
        animation={true}
        action={seeAll}
      >
        {tiles(valuable.data, valuable.isLoading)}
      </Carousel>

      {(sealed.isLoading || (sealed.data?.length ?? 0) > 0) && (
        <Carousel
          title="Sealed products"
          subtitle="Booster boxes, Elite Trainer Boxes, and bundles — tracked like singles."
          itemWidth="210px"
          animation={true}
          action={seeAllSealed}
        >
          {sealedTiles(sealed.data, sealed.isLoading)}
        </Carousel>
      )}

      {(steals.data?.length ?? 0) >= 4 && (
        <Carousel
          title="Steals under $5"
          subtitle="Affordable pickups, priced live."
          animation={true}
          action={seeAll}
        >
          {tiles(steals.data, steals.isLoading)}
        </Carousel>
      )}
    </div>
  );
}
