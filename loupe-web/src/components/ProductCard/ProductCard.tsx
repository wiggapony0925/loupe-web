import { CardThumb } from "@/components/CardThumb/CardThumb";
import { formatMoney } from "@/lib/format";
import type { CardSummary } from "@loupe/core";
import { cx } from "@/lib/cx";
import styles from "./ProductCard.module.scss";

export interface ProductCardProps {
  card: CardSummary;
  variant?: "grid" | "list";
  onClick?: () => void;
}

/** TCGplayer-style product tile — art, identity, "from" price, and market price. */
export function ProductCard({ card, variant = "grid", onClick }: ProductCardProps) {
  const fromPrice = card.low ?? card.price;
  const meta = [card.setName, card.rarity, card.number ? `#${card.number}` : null].filter(Boolean).join(", ");

  return (
    <button
      type="button"
      className={cx(styles["product-card"], styles[`product-card--${variant}`])}
      onClick={onClick}
    >
      <div className={styles["product-card__media"]}>
        <CardThumb src={card.imageUrl} alt={card.name} size="lg" />
      </div>

      <div className={styles["product-card__body"]}>
        <span className={styles["product-card__title"]}>{card.name}</span>
        {meta && <span className={styles["product-card__meta"]}>{meta}</span>}

        <div className={styles["product-card__pricing"]}>
          {fromPrice && (
            <>
              <span className={styles["product-card__from"]}>Listings from</span>
              <span className={styles["product-card__price"]}>{formatMoney(fromPrice)}</span>
            </>
          )}
          {card.price && (
            <span className={styles["product-card__market"]}>
              Market Price: <strong>{formatMoney(card.price)}</strong>
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
