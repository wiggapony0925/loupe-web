import { CardThumb } from "@/components/CardThumb/CardThumb";
import { Delta } from "@/components/Delta/Delta";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { Sparkline } from "@/components/Sparkline/Sparkline";
import { usePriceHistory } from "@loupe/core";
import { formatMoney } from "@/lib/format";
import type { CardSummary } from "@loupe/core";
import styles from "./LiveSparkRow.module.scss";

/**
 * The canonical card row, fed by live data: it fetches the card's real price
 * history to render the sparkline + derived change. Same visual contract as the
 * RN app's PositionRow/MoverSparkRow, but each row resolves its own series.
 */
export function LiveSparkRow({ card, onClick }: { card: CardSummary; onClick?: () => void }) {
  const { data: series, isLoading } = usePriceHistory(card.id);

  return (
    <button type="button" className={styles.row} onClick={onClick}>
      <CardThumb src={card.imageUrl} alt={card.name} size="md" />

      <div className={styles.meta}>
        <span className={styles.title}>{card.name}</span>
        <span className={styles.subtitle}>
          {card.setName}
          {card.number ? ` · ${card.number}` : ""}
        </span>
      </div>

      <div className={styles.spark}>
        {isLoading ? (
          <Skeleton width={104} height={36} radius={8} />
        ) : series && series.points.length > 1 ? (
          <Sparkline data={series.points} width={104} height={36} />
        ) : null}
      </div>

      <div className={styles.price}>
        <span className={styles.amount}>{card.price ? formatMoney(card.price) : "—"}</span>
        {series && <Delta percent={series.changePct} />}
      </div>
    </button>
  );
}
