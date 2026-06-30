import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LayoutGrid, List, Table2 } from "lucide-react";
import {
  usePublicBrowse,
  usePublicSearch,
  usePublicSparklines,
  type BrowseSort,
  type SortKey,
} from "@loupe/core";
import {
  FilterPill,
  Pagination,
  ProductCard,
  SparkRow,
  Skeleton,
  NoteCard,
  Button,
  ComingSoon,
  GameRails,
  type FilterOption,
} from "@/components";
import { EmptyResultsArt } from "@/assets";
import { cx } from "@/lib/cx";
import { SealedRail } from "./SealedRail/SealedRail";
import { GameMarketplace } from "./GameMarketplace/GameMarketplace";
import { CardTable } from "./CardTable/CardTable";
import styles from "./Browse.module.scss";

const PAGE_SIZE = 24;
const SUPPORTED = new Set(["pokemon", "magic", "yugioh", "digimon", "onepiece"]);
// Games the search endpoint accepts as a `tcg` filter (others fall back to all).
const SEARCH_TCGS = new Set([
  "pokemon",
  "magic",
  "yugioh",
  "digimon",
  "onepiece",
  "lorcana",
  "all",
]);

const SORTS: FilterOption[] = [
  { label: "Best Match", value: "best" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Name A–Z", value: "name" },
];

const BROWSE_SORTS: FilterOption[] = [
  { label: "Name A–Z", value: "name" },
  { label: "Newest", value: "newest" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Price: Low to High", value: "price_asc" },
];

const GAME_LABELS: Record<string, string> = {
  pokemon: "Pokémon",
  magic: "Magic: The Gathering",
  yugioh: "Yu-Gi-Oh!",
  lorcana: "Lorcana",
  onepiece: "One Piece",
  digimon: "Digimon",
};

/**
 * Public results page. Two server-driven modes:
 *  - **search** (`?q=`) — server filter/sort/paginate + facets,
 *  - **browse** (`?game=`) — page a whole game catalog (thousands of cards).
 * The client does no derivation.
 */
export function Browse() {
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const gameParam = params.get("game");
  const game = gameParam ?? "pokemon"; // browse landing default
  // Set drilldown (from the Sets explorer): scope the browse to one set.
  const setId = params.get("set");
  // Search defaults to ALL games unless the user picked one in the selector.
  const searchTcg = gameParam && SEARCH_TCGS.has(gameParam) ? gameParam : "all";
  const navigate = useNavigate();
  const isSearch = query.trim().length > 0;
  // Landing = /cards with no explicit game/set/query. We show curated discovery
  // (per-game rails + a sealed rail) instead of defaulting to a full Pokémon
  // catalog (which was both inconsistent with the rails and prone to upstream
  // load failures). Picking a game in the nav (?game=…) still browses the
  // full catalog.
  const isLanding = !isSearch && !gameParam && !setId;

  const [view, setView] = useState<"grid" | "list" | "table">("grid");
  const [sort, setSort] = useState<SortKey>("best");
  const [browseSort, setBrowseSort] = useState<BrowseSort>("name");
  const [rarity, setRarity] = useState<string | null>(null);
  const [setName, setSetName] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // A new query, game, or set drilldown resets filters + paging.
  useEffect(() => {
    setPage(1);
    setRarity(null);
    setSetName(null);
    setSort("best");
    setBrowseSort("name");
  }, [query, game, searchTcg, setId]);

  const search = usePublicSearch(
    {
      q: query,
      tcg: searchTcg,
      rarity,
      set: setName,
      sort,
      page,
      pageSize: PAGE_SIZE,
    },
    isSearch,
  );
  const browse = usePublicBrowse(
    { game, set: setId ?? undefined, page, pageSize: PAGE_SIZE, sort: browseSort },
    !isSearch && !isLanding,
  );
  const active = isSearch ? search : browse;
  const data = active.data;

  const results = useMemo(() => data?.results ?? [], [data]);
  const total = data?.total ?? 0;

  // List view shows Robinhood-style sparkline rows. One *batched* request fetches
  // every visible card's series at once (not one fetch per row) — keeps the list
  // fast. Only fires in list view.
  const sparkIds = useMemo(
    () => (view === "list" ? results.map((c) => c.id) : []),
    [view, results],
  );
  const { data: sparks } = usePublicSparklines(sparkIds, sparkIds.length > 0);
  const sparkMap = useMemo(() => {
    const m = new Map<string, { points: number[]; changePct: number }>();
    for (const s of sparks ?? [])
      m.set(s.cardId, { points: s.points, changePct: s.changePct ?? 0 });
    return m;
  }, [sparks]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rarityOpts: FilterOption[] = (data?.facets.rarities ?? []).map((r) => ({
    label: r,
    value: r,
  }));
  const setOpts: FilterOption[] = (data?.facets.sets ?? []).map((s) => ({
    label: s,
    value: s,
  }));
  const activeFilters = [rarity, setName].filter(Boolean).length;
  const heading = isSearch
    ? `Results for “${query}”`
    : setId
      ? (results[0]?.setName ?? "Set")
      : `Browse ${GAME_LABELS[game] ?? "cards"}`;

  const clearFilters = () => {
    setRarity(null);
    setSetName(null);
    setPage(1);
  };

  return (
    <div className={styles.browse}>
      {/* Landing (/cards) — cross-game discovery: a "Best from <game>" rail per
          TCG plus an all-games sealed rail. */}
      {isLanding && (
        <section className={styles.browse__discover}>
          <GameRails
            onCard={(id) => navigate(`/cards/${encodeURIComponent(id)}`)}
          />
          <SealedRail />
        </section>
      )}

      {/* Per-game marketplace (/cards?game=…) — game-scoped carousels (trending,
          most valuable, steals, sealed) above the full catalog, so each game
          reads like its own storefront. Hidden while searching or set-drilling. */}
      {!isLanding && !isSearch && !setId && SUPPORTED.has(game) && (
        <section className={styles.browse__discover}>
          <GameMarketplace
            game={game}
            onCard={(id) => navigate(`/cards/${encodeURIComponent(id)}`)}
          />
        </section>
      )}

      {isLanding ? null : (
        <>
      <div className={styles.browse__catalogHead}>
        <h1 className={styles.browse__heading}>{heading}</h1>
        {!isSearch && SUPPORTED.has(game) && (
          <p className={styles.browse__sub}>
            The full {GAME_LABELS[game] ?? "card"} catalog — filter, sort, and
            open any card for live prices.
          </p>
        )}
      </div>

      {isSearch && (
        <div className={styles.browse__filters}>
          <FilterPill
            label="Rarity"
            options={rarityOpts}
            value={rarity}
            onChange={(v) => {
              setRarity(v);
              setPage(1);
            }}
          />
          <FilterPill
            label="Set"
            options={setOpts}
            value={setName}
            onChange={(v) => {
              setSetName(v);
              setPage(1);
            }}
          />
          <FilterPill
            label="Sort"
            options={SORTS}
            value={sort === "best" ? null : sort}
            onChange={(v) => {
              setSort((v as SortKey) ?? "best");
              setPage(1);
            }}
          />
          {activeFilters > 0 && (
            <button className={styles.browse__clear} onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      )}

      {!isSearch && SUPPORTED.has(game) && (
        <div className={styles.browse__filters}>
          <FilterPill
            label="Sort"
            options={BROWSE_SORTS}
            value={browseSort === "name" ? null : browseSort}
            onChange={(v) => {
              setBrowseSort((v as BrowseSort) ?? "name");
              setPage(1);
            }}
          />
        </div>
      )}

      <div className={styles.browse__toolbar}>
        <span className={styles.browse__count}>
          {active.isLoading
            ? "Loading…"
            : `${total.toLocaleString()} result${total === 1 ? "" : "s"}`}
        </span>
        <div className={styles.browse__view}>
          <button
            className={cx(
              styles.browse__viewBtn,
              view === "grid" && styles["browse__viewBtn--active"],
            )}
            onClick={() => setView("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            className={cx(
              styles.browse__viewBtn,
              view === "list" && styles["browse__viewBtn--active"],
            )}
            onClick={() => setView("list")}
            aria-label="List view"
          >
            <List size={18} />
          </button>
          <button
            className={cx(
              styles.browse__viewBtn,
              view === "table" && styles["browse__viewBtn--active"],
            )}
            onClick={() => setView("table")}
            aria-label="Table view (price guide)"
          >
            <Table2 size={18} />
          </button>
        </div>
      </div>

      {active.isLoading ? (
        <div className={styles["browse__grid"]}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} height={150} radius={10} />
          ))}
        </div>
      ) : results.length === 0 ? (
        !isSearch && !SUPPORTED.has(game) ? (
          <ComingSoon
            title={`${GAME_LABELS[game] ?? "This game"} — coming soon`}
            message={`We're adding ${GAME_LABELS[game] ?? "this game"} to the live catalog. For now, browse Pokémon, Magic, or Yu-Gi-Oh!.`}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate("/cards?game=pokemon")}
              >
                Browse Pokémon
              </Button>
            }
          />
        ) : (
          <NoteCard
            icon={<EmptyResultsArt size={96} />}
            title={isSearch ? "No cards found" : "Nothing here right now"}
            message={
              isSearch
                ? `No results for “${query}”. Try a broad term like “charizard”.`
                : "We couldn't load this catalog page — try again in a moment."
            }
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate("/cards?game=pokemon")}
              >
                Browse Pokémon
              </Button>
            }
          />
        )
      ) : view === "table" ? (
        <>
          <div style={{ opacity: active.isFetching ? 0.6 : 1, transition: "opacity .15s" }}>
            <CardTable
              cards={results}
              onOpen={(id) => navigate(`/cards/${encodeURIComponent(id)}`)}
            />
          </div>
          <div className={styles.browse__pager}>
            <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          </div>
        </>
      ) : (
        <>
          <div
            className={
              view === "grid" ? styles["browse__grid"] : styles["browse__list"]
            }
            style={{
              opacity: active.isFetching ? 0.6 : 1,
              transition: "opacity .15s",
            }}
          >
            {results.map((c) =>
              view === "list" ? (
                <SparkRow
                  key={c.id}
                  imageUrl={c.imageUrl}
                  title={c.name}
                  subtitle={[c.setName, c.number ? `#${c.number}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                  sparkline={sparkMap.get(c.id)?.points ?? []}
                  changePct={sparkMap.get(c.id)?.changePct ?? 0}
                  price={c.price}
                  onClick={() => navigate(`/cards/${encodeURIComponent(c.id)}`)}
                />
              ) : (
                <ProductCard
                  key={c.id}
                  card={c}
                  variant={view}
                  onClick={() => navigate(`/cards/${encodeURIComponent(c.id)}`)}
                />
              ),
            )}
          </div>
          <div className={styles.browse__pager}>
            <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          </div>
        </>
      )}
        </>
      )}
    </div>
  );
}
