import { Link, useNavigate } from "react-router-dom";
import { usePublicTrending, type CardSummary } from "@loupe/core";
import { Carousel, ShopCard, Skeleton } from "@/components";
import styles from "./TrendingCarousels.module.scss";

/** Live carousels — each is a server-derived cut of trending (no client math). */
export function TrendingCarousels() {
  const navigate = useNavigate();
  const trending = usePublicTrending({ sort: "trending", limit: 20 });
  const valuable = usePublicTrending({ sort: "value", limit: 20 });
  const steals = usePublicTrending({ maxPrice: 5, limit: 20 });

  const go = (c: CardSummary) => navigate(`/cards/${encodeURIComponent(c.id)}`);

  const tiles = (rows: CardSummary[] | undefined, loading: boolean) =>
    loading
      ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={300} radius={14} />)
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

  const seeAll = (
    <Link to="/cards" className={styles.trending__seeall}>
      See all
    </Link>
  );

  return (
    <div id="trending" className={styles.trending}>
      <Carousel
        title="Trending now"
        live
        subtitle="The cards moving most across connected marketplaces — open any one for its full interactive price history."
        action={seeAll}
      >
        {tiles(trending.data, trending.isLoading)}
      </Carousel>

      <Carousel title="Most valuable right now" subtitle="The priciest cards in today's live market." action={seeAll}>
        {tiles(valuable.data, valuable.isLoading)}
      </Carousel>

      {(steals.data?.length ?? 0) >= 4 && (
        <Carousel title="Steals under $5" subtitle="Affordable pickups, priced live." action={seeAll}>
          {tiles(steals.data, steals.isLoading)}
        </Carousel>
      )}
    </div>
  );
}
