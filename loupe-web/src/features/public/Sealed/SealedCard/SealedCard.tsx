import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { type SealedProduct } from "@loupe/core";
import { MediaPlaceholder } from "@/components";
import { formatMoney } from "@/lib/format";
import styles from "./SealedCard.module.scss";

/** Human-readable product-type labels (mirrors SealedProductTypeEnum). */
// eslint-disable-next-line react-refresh/only-export-components -- shared label map co-located with the card
export const SEALED_TYPE_LABEL: Record<string, string> = {
  booster_box: "Booster Box",
  booster_pack: "Booster Pack",
  etb: "Elite Trainer Box",
  collection_box: "Collection Box",
  premium_collection: "Premium Collection",
  tin: "Tin",
  blister: "Blister",
  bundle: "Bundle",
  case: "Case",
  other: "Sealed",
};

/**
 * One sealed-product tile — real product photo (or a themed placeholder), a
 * product-type badge, name, set, and MSRP. The whole tile links to the sealed
 * detail page, where the live market data + add-to-collection live (mirrors the
 * card tile → card detail flow). `owned` shows a quiet "In vault" marker.
 */
export function SealedCard({
  product,
  owned,
}: {
  product: SealedProduct;
  owned: boolean;
}) {
  const typeLabel = SEALED_TYPE_LABEL[product.productType] ?? "Sealed";

  return (
    <Link to={`/sealed/${product.id}`} className={styles.card}>
      <div className={styles.art}>
        {product.imageUrl ? (
          <div className={styles.photo}>
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="lazy"
              className={styles.photoImg}
            />
          </div>
        ) : (
          <MediaPlaceholder kind="sealed" label={product.setName ?? undefined} />
        )}
        <span className={styles.type}>{typeLabel}</span>
        {owned && (
          <span className={styles.owned}>
            <Check size={12} /> In vault
          </span>
        )}
      </div>

      <div className={styles.body}>
        <span className={styles.name}>{product.name}</span>
        <span className={styles.set}>{product.setName ?? "—"}</span>

        <div className={styles.footer}>
          <span className={styles.msrp}>
            {product.msrp ? formatMoney(product.msrp) : "—"}
            <small>MSRP</small>
          </span>
        </div>
      </div>
    </Link>
  );
}
