import { Package, X } from "lucide-react";
import { useDeleteSealedHolding, useSealedHoldings } from "@loupe/core";
import { CardThumb } from "@/components";
import { formatMoney } from "@/lib/format";
import { SEALED_TYPE_LABEL } from "../SealedCard/SealedCard";
import styles from "./SealedHoldings.module.scss";

/**
 * The user's sealed holdings, rendered inside the Vault beneath their singles.
 * Lists each owned product (qty, estimated value) with a remove action. Self-
 * hides when the user owns no sealed product, so the Vault stays clean.
 */
export function SealedHoldings() {
  const { data: holdings, isLoading } = useSealedHoldings({ sort: "value_desc" });
  const del = useDeleteSealedHolding();

  if (isLoading || !holdings || holdings.length === 0) return null;

  const total = holdings.reduce(
    (sum, h) => sum + (h.estimatedValue?.amount ?? 0) * (h.quantity ?? 1),
    0,
  );

  return (
    <section className={styles.sealed}>
      <div className={styles.sealed__head}>
        <h2 className={styles.sealed__title}>Sealed &amp; packs</h2>
        {total > 0 && (
          <span className={styles.sealed__total}>
            {formatMoney({ amount: total, currency: "USD" })}
          </span>
        )}
      </div>

      <div className={styles.rows}>
        {holdings.map((h) => {
          const typeLabel = h.productType
            ? (SEALED_TYPE_LABEL[h.productType] ?? "Sealed")
            : "Sealed";
          return (
            <div key={h.id} className={styles.row}>
              <span className={styles.row__thumb}>
                {h.productImageUrl ? (
                  <CardThumb src={h.productImageUrl} alt={h.productName ?? "Sealed"} size="sm" />
                ) : (
                  <span className={styles.row__placeholder} aria-hidden>
                    <Package size={20} />
                  </span>
                )}
              </span>
              <div className={styles.row__id}>
                <span className={styles.row__name}>
                  {h.productName ?? "Sealed product"}
                </span>
                <span className={styles.row__meta}>
                  {[
                    typeLabel,
                    h.quantity > 1 ? `×${h.quantity}` : null,
                    h.productSetName,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <span className={styles.row__value}>
                {h.estimatedValue ? formatMoney(h.estimatedValue) : "—"}
              </span>
              <button
                type="button"
                className={styles.row__remove}
                aria-label={`Remove ${h.productName ?? "holding"}`}
                onClick={() => del.mutate(h.id)}
                disabled={del.isPending}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
