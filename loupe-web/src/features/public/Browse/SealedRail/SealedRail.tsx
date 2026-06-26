import { Link } from "react-router-dom";
import { usePublicSealedSearch, useSealedHoldings } from "@loupe/core";
import { Carousel, MediaPlaceholder } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { SealedCard } from "../../Sealed/SealedCard/SealedCard";
import styles from "./SealedRail.module.scss";

/**
 * Sealed-products discovery rail — booster boxes, ETBs, and bundles in a
 * horizontal carousel, consistent with the per-game GameRails above it. Used
 * both on the browse landing (all games) and inside a per-game marketplace
 * (pass `tcg` to scope it to one game). Self-hides if the sealed catalog
 * returns nothing for the slice — e.g. games with thin sealed coverage.
 */
export function SealedRail({
  tcg,
  label,
  productType,
  title,
  subtitle,
  minItems = 1,
}: {
  tcg?: string;
  label?: string;
  /** SealedProductTypeEnum value to scope the rail (e.g. "booster_box"). */
  productType?: string;
  /** Override the rail title (defaults to "Sealed <label> products"). */
  title?: string;
  subtitle?: string;
  /** Hide the rail unless at least this many products are found. */
  minItems?: number;
} = {}) {
  const { user } = useAuth();
  const { data: products, isLoading } = usePublicSealedSearch({
    limit: 16,
    tcg,
    productType,
  });
  const { data: holdings } = useSealedHoldings({}, Boolean(user));
  const ownedIds = new Set((holdings ?? []).map((h) => h.productId));
  const items = products ?? [];

  if (!isLoading && items.length < minItems) return null;

  return (
    <Carousel
      title={title ?? (tcg && label ? `Sealed ${label} products` : "Sealed products")}
      subtitle={
        subtitle ??
        "Booster boxes, Elite Trainer Boxes, and bundles — tracked like singles."
      }
      itemWidth="210px"
      action={
        <Link to="/sealed" className={styles.seeall}>
          See all
        </Link>
      }
    >
      {isLoading
        ? Array.from({ length: 8 }).map((_, i) => (
            <MediaPlaceholder key={i} kind="sealed" loading />
          ))
        : items.map((p) => (
            <SealedCard key={p.id} product={p} owned={ownedIds.has(p.id)} />
          ))}
    </Carousel>
  );
}
