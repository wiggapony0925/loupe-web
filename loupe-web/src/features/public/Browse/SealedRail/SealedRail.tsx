import { Link } from "react-router-dom";
import { usePublicSealedSearch, useSealedHoldings } from "@loupe/core";
import { Carousel, MediaPlaceholder } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { SealedCard } from "../../Sealed/SealedCard/SealedCard";
import styles from "./SealedRail.module.scss";

/**
 * Sealed-products discovery rail for the browse landing — booster boxes, ETBs,
 * and bundles in a horizontal carousel, consistent with the per-game GameRails
 * above it. Replaces the flaky full Pokémon catalog that used to render here.
 * Self-hides if the sealed catalog returns nothing.
 */
export function SealedRail() {
  const { user } = useAuth();
  const { data: products, isLoading } = usePublicSealedSearch({ limit: 16 });
  const { data: holdings } = useSealedHoldings({}, Boolean(user));
  const ownedIds = new Set((holdings ?? []).map((h) => h.productId));
  const items = products ?? [];

  if (!isLoading && items.length === 0) return null;

  return (
    <Carousel
      title="Sealed products"
      subtitle="Booster boxes, Elite Trainer Boxes, and bundles — tracked like singles."
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
