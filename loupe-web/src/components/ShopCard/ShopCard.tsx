import { CardThumb } from "@/components/CardThumb/CardThumb";
import { Delta } from "@/components/Delta/Delta";
import { Badge } from "@/components/Badge/Badge";
import { formatMoney } from "@/lib/format";
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
          <span className={styles.price}>{price ? formatMoney(price) : "—"}</span>
          {changePct !== undefined && (
            <Delta percent={changePct} variant="arrow" />
          )}
        </div>
        {/* Rarity caption sits on its own line — a long tag like "RARE RAINBOW"
            won't fit beside a 4-figure price in a narrow tile. */}
        {changePct === undefined && tag && (
          <span className={styles.tag}>{tag}</span>
        )}
      </div>
    </button>
  );
}
