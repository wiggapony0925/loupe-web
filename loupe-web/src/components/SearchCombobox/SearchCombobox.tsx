import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { DropdownMenu } from "radix-ui";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import {
  usePublicSearch,
  usePublicSealedSearch,
  usePublicSparklines,
  type CardSummary,
  type SealedProduct,
} from "@loupe/core";
import { CardThumb } from "@/components/CardThumb/CardThumb";
import { Sparkline } from "@/components/Sparkline/Sparkline";
import { formatMoney } from "@/lib/format";
import { cx } from "@/lib/cx";
import styles from "./SearchCombobox.module.scss";

const CATEGORIES = [
  { label: "All", tcg: "all" },
  { label: "Pokémon", tcg: "pokemon" },
  { label: "Magic", tcg: "magic" },
  { label: "Yu-Gi-Oh!", tcg: "yugioh" },
  { label: "Lorcana", tcg: "lorcana" },
  { label: "One Piece", tcg: "onepiece" },
  { label: "Digimon", tcg: "digimon" },
] as const;

// Sealed product exists only for these games; for the rest we skip the lookup.
const SEALED_TCGS = new Set(["pokemon", "magic", "yugioh"]);
const SEALED_LABEL: Record<string, string> = {
  booster_box: "Booster Box",
  booster_pack: "Booster Pack",
  etb: "Elite Trainer Box",
  collection_box: "Collection Box",
  premium_collection: "Premium Collection",
  tin: "Tin",
  blister: "Blister",
  bundle: "Bundle",
  case: "Case",
  other: "Sealed",
};

export interface SearchComboboxProps {
  initialQuery?: string;
  onSearch: (query: string, tcg: string) => void;
  onSelectCard: (card: CardSummary) => void;
  /** Optional — when provided, the typeahead also surfaces sealed products. */
  onSelectSealed?: (product: SealedProduct) => void;
  size?: "md" | "lg";
  className?: string;
}

/**
 * Custom search with a themed category dropdown (no native `<select>` — fixes
 * white-in-dark-mode) and a live, debounced typeahead of card suggestions.
 * Fully keyboard navigable with loading / empty / error states.
 */
export function SearchCombobox({
  initialQuery = "",
  onSearch,
  onSelectCard,
  onSelectSealed,
  size = "md",
  className,
}: SearchComboboxProps) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(
    CATEGORIES[0],
  );
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery.trim());
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Debounce for suggestions so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 220);
    return () => clearTimeout(t);
  }, [query]);

  const enabled = open && debounced.length >= 2;
  const { data, isFetching, isError } = usePublicSearch(
    { q: debounced, tcg: category.tcg, pageSize: 6 },
    enabled,
  );
  const suggestions = useMemo(
    () => (enabled ? (data?.results ?? []) : []),
    [enabled, data],
  );

  // Sealed products live in their own catalog; surface them alongside singles
  // when the host wired a handler and the selected game has sealed product.
  const sealedTcg = SEALED_TCGS.has(category.tcg) ? category.tcg : undefined;
  const sealedAllowed =
    Boolean(onSelectSealed) &&
    (category.tcg === "all" || sealedTcg !== undefined);
  const { data: sealedData } = usePublicSealedSearch(
    { q: debounced, tcg: sealedTcg, limit: 4 },
    enabled && sealedAllowed,
  );
  const sealed = useMemo(
    () => (enabled && sealedAllowed ? (sealedData ?? []).slice(0, 4) : []),
    [enabled, sealedAllowed, sealedData],
  );

  const showPanel = open && debounced.length >= 2;
  const cardCount = suggestions.length;
  const sealedCount = sealed.length;
  // Flat, keyboard-navigable order: cards, then sealed, then the "search all" row.
  const allIndex = cardCount + sealedCount;
  const itemCount = allIndex + 1;

  // One batched request for the visible rows' mini trend lines (StockX-style).
  const sparkIds = useMemo(() => suggestions.map((c) => c.id), [suggestions]);
  const { data: sparks } = usePublicSparklines(sparkIds, showPanel);
  const sparkMap = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const s of sparks ?? [])
      if (s.points.length > 1) m.set(s.cardId, s.points);
    return m;
  }, [sparks]);

  // Reset highlight whenever the result set changes.
  useEffect(() => setActive(-1), [debounced, cardCount, sealedCount]);

  // Close when clicking outside.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    setOpen(false);
    onSearch(query.trim(), category.tcg);
  }
  function selectCard(c: CardSummary) {
    setOpen(false);
    setQuery("");
    onSelectCard(c);
  }
  function selectSealed(p: SealedProduct) {
    setOpen(false);
    setQuery("");
    onSelectSealed?.(p);
  }
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!showPanel) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % itemCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + itemCount) % itemCount);
    } else if (e.key === "Enter") {
      if (active >= 0 && active < cardCount) {
        e.preventDefault();
        selectCard(suggestions[active]!);
      } else if (active >= cardCount && active < allIndex) {
        e.preventDefault();
        selectSealed(sealed[active - cardCount]!);
      } else {
        submit(e);
      }
    }
  }

  return (
    <div
      ref={rootRef}
      className={cx(styles.combo, styles[`combo--${size}`], className)}
    >
      <form className={styles.combo__bar} onSubmit={submit} role="search">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className={styles.combo__category}
              aria-label="Category"
            >
              {category.label} <ChevronDown size={15} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className={styles.combo__menu}
              align="start"
              sideOffset={8}
            >
              {CATEGORIES.map((c) => (
                <DropdownMenu.Item
                  key={c.tcg}
                  className={styles.combo__option}
                  onSelect={() => setCategory(c)}
                >
                  <span>{c.label}</span>
                  {c.tcg === category.tcg && (
                    <Check size={15} className={styles.combo__check} />
                  )}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <div className={styles.combo__field}>
          <input
            className={styles.combo__input}
            type="text"
            placeholder="Search 130,000+ cards…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={listId}
            aria-autocomplete="list"
          />
          {query && (
            <button
              type="button"
              className={styles.combo__clear}
              onClick={() => {
                setQuery("");
                setOpen(false);
              }}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <button
          className={styles.combo__submit}
          type="submit"
          aria-label="Search"
        >
          <Search />
        </button>
      </form>

      {showPanel && (
        <div className={styles.combo__panel} id={listId} role="listbox">
          {isFetching && cardCount === 0 && sealedCount === 0 ? (
            <div className={styles.combo__status}>
              <Loader2 className={styles.combo__spin} size={16} /> Searching…
            </div>
          ) : isError ? (
            <div className={styles.combo__status}>
              Couldn't load suggestions — press Enter to search.
            </div>
          ) : cardCount === 0 && sealedCount === 0 ? (
            <div className={styles.combo__status}>
              No quick matches for “{debounced}” — press Enter to search all{" "}
              {category.tcg === "all" ? "cards" : category.label}.
            </div>
          ) : (
            <>
              {suggestions.map((c, i) => {
                const spark = sparkMap.get(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    className={cx(
                      styles.combo__row,
                      i === active && styles["combo__row--active"],
                    )}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => selectCard(c)}
                  >
                    <span className={styles.combo__thumb}>
                      <CardThumb src={c.imageUrl} alt={c.name} size="sm" />
                    </span>
                    <span className={styles.combo__rowText}>
                      <span className={styles.combo__rowName}>{c.name}</span>
                      <span className={styles.combo__rowMeta}>
                        {[c.setName, c.rarity].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className={styles.combo__rowRight}>
                      {spark && (
                        <Sparkline
                          data={spark}
                          width={56}
                          height={24}
                          fill={false}
                          strokeWidth={1.5}
                        />
                      )}
                      {c.price && (
                        <span className={styles.combo__rowPrice}>
                          {formatMoney(c.price)}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}

              {sealedCount > 0 && (
                <>
                  <div className={styles.combo__section}>Sealed products</div>
                  {sealed.map((p, j) => {
                    const idx = cardCount + j;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="option"
                        aria-selected={idx === active}
                        className={cx(
                          styles.combo__row,
                          idx === active && styles["combo__row--active"],
                        )}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => selectSealed(p)}
                      >
                        <span className={styles.combo__thumb}>
                          <CardThumb
                            src={p.imageUrl ?? ""}
                            alt={p.name}
                            size="sm"
                          />
                        </span>
                        <span className={styles.combo__rowText}>
                          <span className={styles.combo__rowName}>{p.name}</span>
                          <span className={styles.combo__rowMeta}>
                            {[
                              p.setName,
                              SEALED_LABEL[p.productType] ?? "Sealed",
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <span className={styles.combo__rowRight}>
                          {p.msrp && (
                            <span className={styles.combo__rowPrice}>
                              {formatMoney(p.msrp)}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
            </>
          )}

          <button
            type="button"
            className={cx(
              styles.combo__all,
              active === allIndex && styles["combo__row--active"],
            )}
            onMouseEnter={() => setActive(allIndex)}
            onClick={() => submit()}
          >
            <Search size={15} /> Search all results for “{debounced}”
          </button>
        </div>
      )}
    </div>
  );
}
