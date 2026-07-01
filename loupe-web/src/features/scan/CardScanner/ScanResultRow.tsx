import { Check, X } from "lucide-react";
import { usePriceHistory } from "@loupe/core";
import { CardThumb, Delta, Sparkline } from "@/components";
import { cx } from "@/lib/cx";
import { formatMoney } from "@/lib/format";
import { candidateArt } from "../candidateArt";
import type { TrayEntry } from "./scanTypes";
import styles from "./ScanResultRow.module.scss";

/**
 * One scanned card as a rich row — the captured photo resolves to the matched
 * card with its live price, collector number, and 30-day price trend (the same
 * sparkline row the vault uses). Identifying / no-match states show the photo.
 */
export function ScanResultRow({
  entry,
  onOpen,
  onRemove,
}: {
  entry: TrayEntry;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const card = entry.card;
  const matched = entry.status === "matched" && card !== null;
  // Only fetch once we have a real card id; "" disables the query.
  const { data: series, isLoading } = usePriceHistory(matched ? card.id : "", "30d");
  const price = series?.points.length ? series.points[series.points.length - 1] : undefined;
  const hasTrend = !!series && series.points.length > 1;

  return (
    <li className={styles.row}>
      <button
        type="button"
        className={styles.main}
        onClick={onOpen}
        disabled={!matched}
        aria-label={matched ? `View ${card.name}` : entry.status}
      >
        <span className={styles.art}>
          {matched ? (
            <CardThumb
              src={candidateArt(card)}
              alt={card.name}
              size="sm"
              className={styles.thumb}
            />
          ) : (
            <img
              src={entry.photo}
              alt=""
              className={cx(styles.photo, entry.status === "nomatch" && styles.dim)}
            />
          )}
          {entry.status === "identifying" && <span className={styles.scan} aria-hidden />}
          {matched && (
            <span className={styles.check} aria-hidden>
              <Check size={10} />
            </span>
          )}
        </span>

        <span className={styles.meta}>
          {matched ? (
            <>
              <span className={styles.name}>{card.name}</span>
              <span className={styles.sub}>
                {[card.setName, card.number && `#${card.number}`]
                  .filter(Boolean)
                  .join(" · ") || "Tap to open"}
              </span>
            </>
          ) : (
            <>
              <span className={cx(styles.name, styles.muted)}>
                {entry.status === "identifying" ? "Identifying…" : "No match"}
              </span>
              <span className={styles.sub}>
                {entry.status === "identifying" ? "Reading the card" : "Tap × to retake"}
              </span>
            </>
          )}
        </span>

        {matched && (
          <>
            <span className={styles.spark}>
              {isLoading ? (
                <span className={styles.sparkSkel} />
              ) : hasTrend ? (
                <Sparkline data={series.points} width={70} height={30} />
              ) : null}
            </span>
            <span className={styles.price}>
              <span className={styles.amount}>
                {price != null ? formatMoney(price) : "—"}
              </span>
              {hasTrend && <Delta percent={series.changePct} size="sm" />}
            </span>
          </>
        )}
      </button>
      <button
        type="button"
        className={styles.remove}
        onClick={onRemove}
        aria-label="Remove"
      >
        <X size={13} />
      </button>
    </li>
  );
}
