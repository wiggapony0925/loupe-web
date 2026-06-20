import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  usePublicBrowse,
  usePublicTrending,
  type BrowseSort,
  type CardSummary,
} from "@loupe/core";
import {
  ProductCard,
  Pagination,
  FilterPill,
  Skeleton,
  ComingSoon,
  Carousel,
  ShopCard,
  GameRails,
  type FilterOption,
} from "@/components";
import { cx } from "@/lib/cx";
import styles from "./Markets.module.scss";

const GAMES = [
  { label: "Pokémon", game: "pokemon" },
  { label: "Magic", game: "magic" },
  { label: "Yu-Gi-Oh!", game: "yugioh" },
];
const PAGE_SIZE = 24;
const SORTS: FilterOption[] = [
  { label: "Name A–Z", value: "name" },
  { label: "Newest", value: "newest" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Price: Low to High", value: "price_asc" },
];

/** Markets + Explore, consolidated: curated live rails on top, full catalog browse below. */
export function Markets() {
  const navigate = useNavigate();
  const go = (id: string) => navigate(`/cards/${encodeURIComponent(id)}`);

  const trending = usePublicTrending({ sort: "trending", limit: 20 });
  const valuable = usePublicTrending({ sort: "value", limit: 20 });

  const [game, setGame] = useState("pokemon");
  const [sort, setSort] = useState<BrowseSort>("name");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    setSort("name");
  }, [game]);

  const { data, isLoading, isFetching } = usePublicBrowse({
    game,
    page,
    pageSize: PAGE_SIZE,
    sort,
  });
  const results = data?.results ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
            onClick={() => go(c.id)}
          />
        ));

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Markets &amp; Explore</p>
        <h1 className={styles.title}>The live market.</h1>
      </header>

      <Carousel
        title="Trending now"
        live
        subtitle="Moving most across connected marketplaces."
      >
        {tiles(trending.data, trending.isLoading)}
      </Carousel>
      <Carousel
        title="Most valuable right now"
        subtitle="The priciest cards in today's live market."
      >
        {tiles(valuable.data, valuable.isLoading)}
      </Carousel>

      <GameRails onCard={go} />

      <section className={styles.browse}>
        <h2 className={styles.browseTitle}>Browse the catalog</h2>

        <div className={styles.tabs}>
          {GAMES.map((g) => (
            <button
              key={g.game}
              className={cx(styles.tab, game === g.game && styles.tabActive)}
              onClick={() => setGame(g.game)}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className={styles.toolbar}>
          <span className={styles.count}>
            {isLoading ? "Loading…" : `${total.toLocaleString()} cards`}
          </span>
          <FilterPill
            label="Sort"
            options={SORTS}
            value={sort === "name" ? null : sort}
            onChange={(v) => {
              setSort((v as BrowseSort) ?? "name");
              setPage(1);
            }}
          />
        </div>

        {isLoading ? (
          <div className={styles.grid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} height={150} radius={10} />
            ))}
          </div>
        ) : results.length === 0 ? (
          <ComingSoon
            title="Nothing here right now"
            message="Try Pokémon, Magic, or Yu-Gi-Oh!."
          />
        ) : (
          <>
            <div
              className={styles.grid}
              style={{
                opacity: isFetching ? 0.6 : 1,
                transition: "opacity .15s",
              }}
            >
              {results.map((c) => (
                <ProductCard key={c.id} card={c} onClick={() => go(c.id)} />
              ))}
            </div>
            <div className={styles.pager}>
              <Pagination
                page={page}
                pageCount={pageCount}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
