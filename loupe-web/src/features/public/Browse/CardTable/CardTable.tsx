import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from "lucide-react";
import type { CardSummary } from "@loupe/core";
import { CardThumb, Badge } from "@/components";
import { formatMoney } from "@/lib/format";
import { cx } from "@/lib/cx";
import styles from "./CardTable.module.scss";

type Col = "name" | "number" | "rarity" | "price" | "low";
type Dir = "asc" | "desc";

/** Leading integer of a collector number ("076/086" → 76) for numeric sort. */
function numVal(n?: string): number {
  const m = /\d+/.exec(n ?? "");
  return m ? Number(m[0]) : Number.POSITIVE_INFINITY; // un-numbered sort last
}

/** Sortable column header. Hoisted to module scope so it isn't remounted on
 *  every parent render (which would drop focus + churn the DOM). */
function SortHeader({
  id,
  label,
  align,
  col,
  dir,
  onSort,
}: {
  id: Col;
  label: string;
  align?: "right";
  col: Col;
  dir: Dir;
  onSort: (c: Col) => void;
}) {
  return (
    <th className={cx(styles.th, align === "right" && styles["th--right"])}>
      <button
        type="button"
        className={styles.thBtn}
        onClick={() => onSort(id)}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {col === id ? (
          dir === "asc" ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )
        ) : (
          <ChevronsUpDown size={14} className={styles.thBtn__idle} />
        )}
      </button>
    </th>
  );
}

function compare(a: CardSummary, b: CardSummary, col: Col): number {
  switch (col) {
    case "name":
      return a.name.localeCompare(b.name);
    case "number":
      return numVal(a.number) - numVal(b.number);
    case "rarity":
      return (a.rarity ?? "").localeCompare(b.rarity ?? "");
    case "price":
      return (a.price?.amount ?? -1) - (b.price?.amount ?? -1);
    case "low":
      return (a.low?.amount ?? -1) - (b.low?.amount ?? -1);
  }
}

/**
 * Price-guide table for a set's cards — TCGplayer-style columns (image, name,
 * number, rarity, market, from) with sortable headers and a search-any-column
 * box, themed to Loupe. Sort + search operate on the loaded page client-side;
 * rarity/set filtering and paging stay server-driven in the parent.
 */
export function CardTable({
  cards,
  onOpen,
}: {
  cards: CardSummary[];
  onOpen: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [col, setCol] = useState<Col>("number");
  const [dir, setDir] = useState<Dir>("asc");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? cards.filter((c) =>
          `${c.name} ${c.number ?? ""} ${c.rarity ?? ""}`
            .toLowerCase()
            .includes(needle),
        )
      : cards;
    const sorted = [...filtered].sort((a, b) => compare(a, b, col));
    return dir === "desc" ? sorted.reverse() : sorted;
  }, [cards, q, col, dir]);

  const sortBy = (c: Col) => {
    if (c === col) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setCol(c);
      setDir(c === "price" || c === "low" ? "desc" : "asc");
    }
  };

  const th = (id: Col, label: string, align?: "right") => (
    <SortHeader id={id} label={label} align={align} col={col} dir={dir} onSort={sortBy} />
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.searchWrap}>
        <Search size={16} className={styles.searchIcon} />
        <input
          className={styles.search}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search this set — name, number, or rarity…"
          aria-label="Search the table"
        />
        {q && <span className={styles.searchCount}>{rows.length}</span>}
      </div>

      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={cx(styles.th, styles["th--img"])} aria-label="Image" />
              {th("name", "Product name")}
              {th("number", "Number")}
              {th("rarity", "Rarity")}
              {th("low", "From", "right")}
              {th("price", "Market price", "right")}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={c.id}
                className={styles.row}
                onClick={() => onOpen(c.id)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(c.id);
                  }
                }}
              >
                <td className={styles["td--img"]}>
                  <CardThumb src={c.imageUrl} alt={c.name} size="sm" />
                </td>
                <td className={styles.name}>{c.name}</td>
                <td className={styles.muted}>{c.number ?? "—"}</td>
                <td>
                  {c.rarity ? (
                    <Badge tone="neutral">{c.rarity}</Badge>
                  ) : (
                    <span className={styles.muted}>—</span>
                  )}
                </td>
                <td className={styles.priceCell}>
                  {c.low ? formatMoney(c.low) : <span className={styles.muted}>—</span>}
                </td>
                <td className={cx(styles.priceCell, styles.market)}>
                  {c.price ? formatMoney(c.price) : <span className={styles.muted}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className={styles.empty}>No cards match “{q}”.</p>
        )}
      </div>
    </div>
  );
}
