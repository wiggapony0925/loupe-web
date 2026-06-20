import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { cx } from "@/lib/cx";
import styles from "./SearchBar.module.scss";

export interface SearchBarProps {
  initialQuery?: string;
  /** Called on submit with the trimmed query + selected category. */
  onSearch: (query: string, category: string) => void;
  size?: "md" | "lg";
  className?: string;
}

const CATEGORIES = ["All", "Pokémon", "Magic", "Yu-Gi-Oh!", "Lorcana", "One Piece"];

/** TCGplayer-style search: category select + query input + submit. Reusable on web + mobile. */
export function SearchBar({ initialQuery = "", onSearch, size = "md", className }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(CATEGORIES[0]);

  function submit(e: FormEvent) {
    e.preventDefault();
    onSearch(query.trim(), category ?? "All");
  }

  return (
    <form className={cx(styles["search-bar"], styles[`search-bar--${size}`], className)} onSubmit={submit}>
      <select
        className={styles["search-bar__category"]}
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        aria-label="Category"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input
        className={styles["search-bar__input"]}
        type="search"
        placeholder="Try “ghost rares”"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search cards"
      />
      <button className={styles["search-bar__button"]} type="submit" aria-label="Search">
        <Search />
      </button>
    </form>
  );
}
