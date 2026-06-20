import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { DropdownMenu } from "radix-ui";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { usePublicSearch, type CardSummary } from "@loupe/core";
import { CardThumb } from "@/components/CardThumb/CardThumb";
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

export interface SearchComboboxProps {
  initialQuery?: string;
  onSearch: (query: string, tcg: string) => void;
  onSelectCard: (card: CardSummary) => void;
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
  size = "md",
  className,
}: SearchComboboxProps) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(CATEGORIES[0]);
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
    { q: debounced, tcg: category.tcg, pageSize: 7 },
    enabled,
  );
  const suggestions = useMemo(() => (enabled ? data?.results ?? [] : []), [enabled, data]);
  const showPanel = open && debounced.length >= 2;
  const itemCount = suggestions.length + 1; // + the "search all" row

  // Reset highlight whenever the result set changes.
  useEffect(() => setActive(-1), [debounced, suggestions.length]);

  // Close when clicking outside.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
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
      if (active >= 0 && active < suggestions.length) {
        e.preventDefault();
        selectCard(suggestions[active]!);
      } else {
        submit(e);
      }
    }
  }

  return (
    <div ref={rootRef} className={cx(styles.combo, styles[`combo--${size}`], className)}>
      <form className={styles.combo__bar} onSubmit={submit} role="search">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className={styles.combo__category} aria-label="Category">
              {category.label} <ChevronDown size={15} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className={styles.combo__menu} align="start" sideOffset={8}>
              {CATEGORIES.map((c) => (
                <DropdownMenu.Item key={c.tcg} className={styles.combo__option} onSelect={() => setCategory(c)}>
                  <span>{c.label}</span>
                  {c.tcg === category.tcg && <Check size={15} className={styles.combo__check} />}
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

        <button className={styles.combo__submit} type="submit" aria-label="Search">
          <Search />
        </button>
      </form>

      {showPanel && (
        <div className={styles.combo__panel} id={listId} role="listbox">
          {isFetching && suggestions.length === 0 ? (
            <div className={styles.combo__status}>
              <Loader2 className={styles.combo__spin} size={16} /> Searching…
            </div>
          ) : isError ? (
            <div className={styles.combo__status}>Couldn't load suggestions — press Enter to search.</div>
          ) : suggestions.length === 0 ? (
            <div className={styles.combo__status}>No matches for “{debounced}”.</div>
          ) : (
            suggestions.map((c, i) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={i === active}
                className={cx(styles.combo__row, i === active && styles["combo__row--active"])}
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
                {c.price && <span className={styles.combo__rowPrice}>{formatMoney(c.price)}</span>}
              </button>
            ))
          )}

          <button
            type="button"
            className={cx(styles.combo__all, active === suggestions.length && styles["combo__row--active"])}
            onMouseEnter={() => setActive(suggestions.length)}
            onClick={() => submit()}
          >
            <Search size={15} /> Search all results for “{debounced}”
          </button>
        </div>
      )}
    </div>
  );
}
