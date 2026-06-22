import type { CSSProperties } from "react";
import {
  Archive,
  Box,
  Boxes,
  Gift,
  Container,
  Package,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import styles from "./SealedArt.module.scss";

/** Product-type → silhouette icon for the generated cover. */
const TYPE_ICON: Record<string, LucideIcon> = {
  booster_box: Boxes,
  booster_pack: Package,
  etb: Gift,
  collection_box: Box,
  premium_collection: Sparkles,
  tin: Archive,
  blister: Package,
  bundle: Boxes,
  case: Container,
  other: Package,
};

/** Deterministic hue (0–359) from a string so each set gets a stable colour. */
function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

/**
 * Generated "pack art" for sealed products that have no photo (the catalog
 * ships none). A stable per-set colour wash + the product-type silhouette +
 * the set name — so every sealed product shows a distinct, recognisable cover
 * instead of an empty placeholder.
 */
export function SealedArt({
  setName,
  productType,
  typeLabel,
}: {
  setName?: string | null;
  productType: string;
  typeLabel: string;
}) {
  const seed = setName || productType;
  const hue = hueFromString(seed);
  const Icon = TYPE_ICON[productType] ?? Package;
  const style = { "--h": hue } as CSSProperties;

  return (
    <div className={styles.art} style={style} role="img" aria-label={`${setName ?? ""} ${typeLabel}`}>
      <span className={styles.sheen} aria-hidden />
      <Icon className={styles.icon} aria-hidden />
      <span className={styles.scrim} aria-hidden />
      <span className={styles.label}>
        {setName && <span className={styles.set}>{setName}</span>}
        <span className={styles.type}>{typeLabel}</span>
      </span>
    </div>
  );
}
