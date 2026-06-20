import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "@/lib/cx";
import styles from "./Pagination.module.scss";

export interface PaginationProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

/** Build a compact page list with ellipses, e.g. [1, 2, 3, 4, 5, …, 200]. */
function pageItems(page: number, pageCount: number): Array<number | "…"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const items: Array<number | "…"> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) items.push("…");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < pageCount - 1) items.push("…");
  items.push(pageCount);
  return items;
}

/** TCGplayer-style numeric pager. */
export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null;
  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button
        className={styles.pagination__arrow}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft />
      </button>
      {pageItems(page, pageCount).map((item, i) =>
        item === "…" ? (
          <span key={`gap-${i}`} className={styles.pagination__gap}>
            …
          </span>
        ) : (
          <button
            key={item}
            className={cx(styles.pagination__item, item === page && styles["pagination__item--active"])}
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
          >
            {item}
          </button>
        ),
      )}
      <button
        className={styles.pagination__arrow}
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
      >
        <ChevronRight />
      </button>
    </nav>
  );
}
