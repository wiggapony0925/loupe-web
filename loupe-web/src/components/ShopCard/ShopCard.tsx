import { CardThumb } from "@/components/CardThumb/CardThumb";
import { Delta } from "@/components/Delta/Delta";
import { Badge } from "@/components/Badge/Badge";
import { formatMoney } from "@/lib/format";
import { rarityLabel } from "@/lib/rarity";
import type { Money } from "@loupe/core";
import styles from "./ShopCard.module.scss";

export interface ShopCardProps {
  imageUrl: string;
  title: string;
  subtitle: string;
  price?: Money;
  changePct?: number;
  /** Small caption shown when there's no change to display (e.g. rarity). */
  tag?: string;
  rank?: number;
  onClick?: () => void;
}

/** App-Store "Shop" style discovery tile — full-bleed art, quiet caption, price + delta. */
export function ShopCard({ imageUrl, title, subtitle, price, changePct, tag, rank, onClick }: ShopCardProps) {
  const rarity = rarityLabel(tag);
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.art}>
        <CardThumb src={imageUrl} alt={title} size="lg" />
        {rank !== undefined && (
          <span className={styles.rank}>
            <Badge tone="neutral">#{rank}</Badge>
          </span>
        )}
      </div>
      <div className={styles.body}>
        <span className={styles.title}>{title}</span>
        <span className={styles.subtitle}>{subtitle}</span>
        <div className={styles.priceLine}>
          {price ? (
            <>
              <span className={styles.price}>{formatMoney(price)}</span>
              {changePct !== undefined && (
                <Delta percent={changePct} variant="arrow" />
              )}
            </>
          ) : rarity ? (
            // No live price (catalog-only games) — show the rarity as a clear
            // labelled chip, NOT a bare code in the price slot, so it reads as a
            // tag instead of a broken price.
            <Badge tone="neutral">{rarity}</Badge>
          ) : (
            <span className={styles.priceMuted}>—</span>
          )}
        </div>
        {/* When there IS a price, the rarity sits on its own caption line — a
            long tag like "Rare Rainbow" won't fit beside a 4-figure price. */}
        {price && changePct === undefined && rarity && (
          <span className={styles.tag}>{rarity}</span>
        )}
      </div>
    </button>
  );
}
