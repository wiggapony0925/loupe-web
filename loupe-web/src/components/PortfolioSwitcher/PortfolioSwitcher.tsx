/**
 * PortfolioSwitcher — the dashboard's active-portfolio control.
 *
 * Mirrors {@link CurrencySwitcher}: a compact pill (name · chevron) opening a
 * popover of the user's portfolios — the synthetic **All** (everything owned)
 * plus each collection, each with its card count and total value. Selection
 * flows through `useActiveCollection`; every value surface then re-scopes,
 * because the backend does the scoping and the client just passes the id.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Layers } from "lucide-react";
import { useCollectionsOverview, type CollectionSummary } from "@loupe/core";
import { useActiveCollection } from "@/providers/ActiveCollectionProvider";
import styles from "./PortfolioSwitcher.module.scss";

function money(usd: number): string {
  return `$${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function PortfolioSwitcher() {
  const { collectionId, setCollectionId } = useActiveCollection();
  const { data: portfolios } = useCollectionsOverview();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const rows: CollectionSummary[] = useMemo(() => portfolios ?? [], [portfolios]);
  const active = rows.find((r) => r.id === collectionId) ?? rows.find((r) => r.isAll);
  const label = active?.name ?? "All";

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.pill}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Portfolio ${label}. Change portfolio.`}
        onClick={() => setOpen((v) => !v)}
      >
        <Layers size={14} className={styles.icon} aria-hidden />
        <span className={styles.name}>{label}</span>
        <ChevronDown size={13} className={styles.chev} />
      </button>

      {open && (
        <div className={styles.menu} role="listbox" aria-label="Portfolio">
          {rows.map((p) => {
            const isActive = (p.id ?? null) === (collectionId ?? null);
            return (
              <button
                key={p.id ?? "all"}
                type="button"
                role="option"
                aria-selected={isActive}
                className={isActive ? `${styles.row} ${styles.rowActive}` : styles.row}
                onClick={() => {
                  setCollectionId(p.id);
                  setOpen(false);
                }}
              >
                <span
                  className={styles.dot}
                  style={p.color ? { background: p.color } : undefined}
                  aria-hidden
                />
                <span className={styles.rowName}>{p.name}</span>
                <span className={styles.rowMeta}>
                  {p.cardCount} · {money(p.totalValueUsd)}
                </span>
                {isActive && <Check size={14} className={styles.check} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
