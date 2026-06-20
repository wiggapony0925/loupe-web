import { Link, useNavigate } from "react-router-dom";
import { usePublicTrending, type CardSummary } from "@loupe/core";
import { Carousel, ShopCard, Skeleton } from "@/components";
import styles from "./Discover.module.scss";

/** In-shell discovery — curated live carousels (reuses the public market data). */
export function Discover() {
  const navigate = useNavigate();
  const trending = usePublicTrending({ sort: "trending", limit: 20 });
  const valuable = usePublicTrending({ sort: "value", limit: 20 });
  const steals = usePublicTrending({ maxPrice: 5, limit: 20 });
  const go = (id: string) => navigate(`/cards/${encodeURIComponent(id)}`);

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
            onClick={() => go(c.id)}
          />
        ));

  const browseAll = (
    <Link to="/app/markets" className={styles.seeall}>
      Browse all
    </Link>
  );

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Discover</p>
        <h1 className={styles.title}>Find your next card.</h1>
      </header>

      <Carousel title="Trending now" live subtitle="Moving most across connected marketplaces." action={browseAll}>
        {tiles(trending.data, trending.isLoading)}
      </Carousel>
      <Carousel title="Most valuable right now" subtitle="The priciest cards in today's live market." action={browseAll}>
        {tiles(valuable.data, valuable.isLoading)}
      </Carousel>
      {(steals.data?.length ?? 0) >= 4 && (
        <Carousel title="Steals under $5" subtitle="Affordable pickups, priced live." action={browseAll}>
          {tiles(steals.data, steals.isLoading)}
        </Carousel>
      )}
    </div>
  );
}
