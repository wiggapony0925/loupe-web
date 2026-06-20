import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LayoutGrid, List } from "lucide-react";
import { usePublicBrowse, usePublicSearch, type BrowseSort, type SortKey } from "@loupe/core";
import {
  FilterPill,
  Pagination,
  ProductCard,
  Skeleton,
  NoteCard,
  Button,
  ComingSoon,
  type FilterOption,
} from "@/components";
import { EmptyResultsArt } from "@/assets";
import { cx } from "@/lib/cx";
import styles from "./Browse.module.scss";

const PAGE_SIZE = 24;
const SUPPORTED = new Set(["pokemon", "magic", "yugioh"]);

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
  const game = params.get("game") ?? "pokemon";
  const navigate = useNavigate();
  const isSearch = query.trim().length > 0;

  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<SortKey>("best");
  const [browseSort, setBrowseSort] = useState<BrowseSort>("name");
  const [rarity, setRarity] = useState<string | null>(null);
  const [setName, setSetName] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // A new query or game resets filters + paging.
  useEffect(() => {
    setPage(1);
    setRarity(null);
    setSetName(null);
    setSort("best");
    setBrowseSort("name");
  }, [query, game]);

  const search = usePublicSearch({ q: query, rarity, set: setName, sort, page, pageSize: PAGE_SIZE }, isSearch);
  const browse = usePublicBrowse({ game, page, pageSize: PAGE_SIZE, sort: browseSort }, !isSearch);
  const active = isSearch ? search : browse;
  const data = active.data;

  const results = data?.results ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rarityOpts: FilterOption[] = (data?.facets.rarities ?? []).map((r) => ({ label: r, value: r }));
  const setOpts: FilterOption[] = (data?.facets.sets ?? []).map((s) => ({ label: s, value: s }));
  const activeFilters = [rarity, setName].filter(Boolean).length;
  const heading = isSearch ? `Results for “${query}”` : `Browse ${GAME_LABELS[game] ?? "cards"}`;

  const clearFilters = () => {
    setRarity(null);
    setSetName(null);
    setPage(1);
  };

  return (
    <div className={styles.browse}>
      <h1 className={styles.browse__heading}>{heading}</h1>

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
          {active.isLoading ? "Loading…" : `${total.toLocaleString()} result${total === 1 ? "" : "s"}`}
        </span>
        <div className={styles.browse__view}>
          <button
            className={cx(styles.browse__viewBtn, view === "grid" && styles["browse__viewBtn--active"])}
            onClick={() => setView("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            className={cx(styles.browse__viewBtn, view === "list" && styles["browse__viewBtn--active"])}
            onClick={() => setView("list")}
            aria-label="List view"
          >
            <List size={18} />
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
              <Button variant="secondary" size="sm" onClick={() => navigate("/cards?game=pokemon")}>
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
              <Button variant="secondary" size="sm" onClick={() => navigate("/cards?game=pokemon")}>
                Browse Pokémon
              </Button>
            }
          />
        )
      ) : (
        <>
          <div
            className={view === "grid" ? styles["browse__grid"] : styles["browse__list"]}
            style={{ opacity: active.isFetching ? 0.6 : 1, transition: "opacity .15s" }}
          >
            {results.map((c) => (
              <ProductCard
                key={c.id}
                card={c}
                variant={view}
                onClick={() => navigate(`/cards/${encodeURIComponent(c.id)}`)}
              />
            ))}
          </div>
          <div className={styles.browse__pager}>
            <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          </div>
        </>
      )}
    </div>
  );
}
