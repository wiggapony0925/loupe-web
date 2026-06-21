import { useMemo, useState } from "react";
import { type MarketGradeRow, type MarketSnapshot } from "@loupe/core";
import { Delta } from "@/components";
import { cx } from "@/lib/cx";
import { formatMoney } from "@/lib/format";
import styles from "./GradedPrices.module.scss";

const HOUSE_LABEL: Record<string, string> = {
  psa: "PSA",
  cgc: "CGC",
  bgs: "BGS",
  sgc: "SGC",
  tag: "TAG",
};
const HOUSE_ORDER = ["psa", "cgc", "bgs", "sgc", "tag"] as const;

/** Per-house accent — mirrors the mobile app's house colours. */
const HOUSE_VAR: Record<string, string> = {
  psa: "var(--accent-mint)",
  cgc: "var(--accent-blue)",
  bgs: "var(--accent-amber)",
  sgc: "var(--accent-purple)",
  tag: "var(--ink)",
};

function flatten(snapshot: MarketSnapshot, filter: string): MarketGradeRow[] {
  const out: MarketGradeRow[] = [];
  for (const h of snapshot.houses) {
    if (filter !== "all" && h.house !== filter) continue;
    for (const g of h.grades) if (g.source === "real") out.push(g);
  }
  out.sort((a, b) => b.market.amount - a.market.amount);
  return out.slice(0, filter === "all" ? 24 : 16);
}

/**
 * Verified Graded Prices — house filter tabs + a flat table of (house × grade)
 * rows with population, market price, and 30-day change. Mirrors the mobile
 * card-detail graded-prices section, driven by the real (non-synthesized) rows
 * in the market snapshot. Renders nothing until verified comps exist.
 */
export function GradedPrices({ snapshot }: { snapshot: MarketSnapshot | null | undefined }) {
  const [house, setHouse] = useState<string>("all");

  const verifiedHouses = useMemo(() => {
    if (!snapshot) return [];
    return HOUSE_ORDER.filter((h) =>
      snapshot.houses.some((b) => b.house === h && b.grades.some((g) => g.source === "real")),
    );
  }, [snapshot]);

  const rows = useMemo(
    () => (snapshot ? flatten(snapshot, house) : []),
    [snapshot, house],
  );

  if (!snapshot || verifiedHouses.length === 0) return null;

  return (
    <section className={styles.graded}>
      <h2 className={styles.graded__title}>Verified graded prices</h2>

      <div className={styles.graded__tabs} role="tablist" aria-label="Grading house">
        <Tab label="ALL" active={house === "all"} onClick={() => setHouse("all")} />
        {verifiedHouses.map((h) => (
          <Tab
            key={h}
            label={HOUSE_LABEL[h] ?? h.toUpperCase()}
            active={house === h}
            accent={HOUSE_VAR[h]}
            onClick={() => setHouse(h)}
          />
        ))}
      </div>

      {rows.length === 0 ? (
        <p className={styles.graded__empty}>No verified comps for this house.</p>
      ) : (
        <div className={styles.graded__rows}>
          {rows.map((r, i) => (
            <div key={`${r.house}-${r.gradeLabel}-${i}`} className={styles.row}>
              <span
                className={styles.row__house}
                style={{ "--house": HOUSE_VAR[r.house] ?? "var(--ink-muted)" } as React.CSSProperties}
              >
                {HOUSE_LABEL[r.house] ?? r.house.toUpperCase()} {r.gradeLabel}
              </span>
              <span className={styles.row__pop}>
                {r.population > 0 ? `Pop ${r.population.toLocaleString()}` : "—"}
              </span>
              <span className={styles.row__price}>{formatMoney(r.market)}</span>
              <span className={styles.row__delta}>
                {r.changePct !== 0 && <Delta percent={r.changePct} variant="arrow" />}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Tab({
  label,
  active,
  accent,
  onClick,
}: {
  label: string;
  active: boolean;
  accent?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cx(styles.tab, active && styles["tab--active"])}
      style={accent ? ({ "--house": accent } as React.CSSProperties) : undefined}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
