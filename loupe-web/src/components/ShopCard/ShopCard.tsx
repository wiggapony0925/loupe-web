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
          {price ? (
            <>
              <span className={styles.price}>{formatMoney(price)}</span>
              {changePct !== undefined && (
                <Delta percent={changePct} variant="arrow" />
              )}
            </>
          ) : (
            // No live price (e.g. catalog-only games) — surface the rarity in the
            // price slot so the tile reads intentionally instead of showing a
            // bare "—". Keeps every tile the same shape across games.
            <span className={styles.priceMuted}>{tag || "View price"}</span>
          )}
        </div>
        {/* Rarity caption sits on its own line — a long tag like "RARE RAINBOW"
            won't fit beside a 4-figure price in a narrow tile. */}
        {price && changePct === undefined && tag && (
          <span className={styles.tag}>{tag}</span>
        )}
      </div>
    </button>
  );
}
