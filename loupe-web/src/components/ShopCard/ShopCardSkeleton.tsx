import { Skeleton } from "@/components/Skeleton/Skeleton";
import styles from "./ShopCard.module.scss";

/**
 * Loading placeholder shaped exactly like a {@link ShopCard} — padded 5:7 art
 * over title / subtitle / price lines. Used by every marketplace surface (rails
 * + grid) so the loading state matches the real tile instead of a bare block.
 */
export function ShopCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden>
      <div className={styles.art}>
        <Skeleton className={styles.skelArt} width="100%" height="auto" radius={12} />
      </div>
      <div className={styles.body}>
        <Skeleton height={14} width="78%" radius={4} />
        <Skeleton height={12} width="52%" radius={4} />
        <div className={styles.priceLine}>
          <Skeleton height={18} width="44%" radius={4} />
        </div>
      </div>
    </div>
  );
}
