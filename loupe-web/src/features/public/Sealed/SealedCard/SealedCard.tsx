import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Package, Plus } from "lucide-react";
import { useAddSealedHolding, type SealedProduct } from "@loupe/core";
import { CardThumb } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { cx } from "@/lib/cx";
import { formatMoney } from "@/lib/format";
import styles from "./SealedCard.module.scss";

/** Human-readable product-type labels (mirrors SealedProductTypeEnum). */
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
 * One sealed-product tile — art (or a packaged-box placeholder), a product-type
 * badge, name, set, MSRP, and an add-to-vault action. `owned` short-circuits the
 * add button to an "In vault" state so the grid reflects what the user holds.
 */
export function SealedCard({
  product,
  owned,
}: {
  product: SealedProduct;
  owned: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const add = useAddSealedHolding();
  const [justAdded, setJustAdded] = useState(false);

  const inVault = owned || justAdded;
  const typeLabel = SEALED_TYPE_LABEL[product.productType] ?? "Sealed";

  function handleAdd() {
    if (!user) {
      navigate("/login");
      return;
    }
    if (inVault || add.isPending) return;
    add.mutate(
      { productId: product.id, estimatedValueUsd: product.msrp?.amount ?? null },
      { onSuccess: () => setJustAdded(true) },
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.art}>
        {product.imageUrl ? (
          <CardThumb src={product.imageUrl} alt={product.name} size="lg" />
        ) : (
          <div className={styles.placeholder} aria-hidden>
            <Package size={40} />
          </div>
        )}
        <span className={styles.type}>{typeLabel}</span>
      </div>

      <div className={styles.body}>
        <span className={styles.name}>{product.name}</span>
        <span className={styles.set}>{product.setName ?? "—"}</span>

        <div className={styles.footer}>
          <span className={styles.msrp}>
            {product.msrp ? formatMoney(product.msrp) : "—"}
            <small>MSRP</small>
          </span>
          <button
            type="button"
            className={cx(styles.add, inVault && styles["add--owned"])}
            onClick={handleAdd}
            disabled={add.isPending}
            aria-label={inVault ? "In your vault" : "Add to vault"}
          >
            {inVault ? (
              <>
                <Check size={14} /> In vault
              </>
            ) : (
              <>
                <Plus size={14} /> {add.isPending ? "Adding…" : "Add"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
