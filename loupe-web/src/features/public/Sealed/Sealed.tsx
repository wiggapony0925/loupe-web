import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  usePublicSealedSearch,
  useSealedHoldings,
} from "@loupe/core";
import { FilterPill, Skeleton, NoteCard, type FilterOption } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { SealedCard } from "./SealedCard/SealedCard";
import styles from "./Sealed.module.scss";

const GAME_OPTIONS: FilterOption[] = [
  { label: "Pokémon", value: "pokemon" },
  { label: "Magic", value: "magic" },
  { label: "Yu-Gi-Oh!", value: "yugioh" },
  { label: "One Piece", value: "onepiece" },
  { label: "Lorcana", value: "lorcana" },
];

const TYPE_OPTIONS: FilterOption[] = [
  { label: "Booster Box", value: "booster_box" },
  { label: "Elite Trainer Box", value: "etb" },
  { label: "Bundle", value: "bundle" },
  { label: "Collection Box", value: "collection_box" },
  { label: "Premium Collection", value: "premium_collection" },
  { label: "Tin", value: "tin" },
  { label: "Booster Pack", value: "booster_pack" },
  { label: "Blister", value: "blister" },
  { label: "Case", value: "case" },
];

/**
 * Public sealed-product browse — booster boxes, ETBs, tins, and bundles with
 * live MSRP and add-to-vault. Fulfils the landing's "Sealed & packs" promise:
 * anyone can browse the sealed catalog; signed-in users add product to their
 * vault alongside singles.
 */
export function Sealed() {
  const { user } = useAuth();
  const [rawQuery, setRawQuery] = useState("");
  const [q, setQ] = useState("");
  const [tcg, setTcg] = useState<string | null>(null);
  const [productType, setProductType] = useState<string | null>(null);

  // Debounce the text input so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQ(rawQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const { data: products, isLoading } = usePublicSealedSearch({
    q: q || undefined,
    tcg: tcg ?? undefined,
    productType: productType ?? undefined,
    limit: 60,
  });

  const { data: holdings } = useSealedHoldings({}, Boolean(user));
  const ownedIds = useMemo(
    () => new Set((holdings ?? []).map((h) => h.productId)),
    [holdings],
  );

  const items = products ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Sealed &amp; packs</p>
        <h1 className={styles.title}>Track sealed like an asset.</h1>
        <p className={styles.sub}>
          Booster boxes, Elite Trainer Boxes, tins, and bundles — with live MSRP
          and the same vault as your singles.
        </p>
      </header>

      <div className={styles.controls}>
        <div className={styles.search}>
          <Search size={18} className={styles.searchIcon} />
          <input
            className={styles.input}
            type="search"
            placeholder="Search sealed products…"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            aria-label="Search sealed products"
          />
        </div>
        <FilterPill label="Game" options={GAME_OPTIONS} value={tcg} onChange={setTcg} />
        <FilterPill
          label="Product type"
          options={TYPE_OPTIONS}
          value={productType}
          onChange={setProductType}
        />
      </div>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={320} radius={14} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <NoteCard
          title="No sealed products found"
          message="Try a different game, product type, or search term."
        />
      ) : (
        <div className={styles.grid}>
          {items.map((p) => (
            <SealedCard key={p.id} product={p} owned={ownedIds.has(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
