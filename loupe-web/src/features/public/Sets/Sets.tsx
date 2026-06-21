import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layers } from "lucide-react";
import type { SyntheticEvent } from "react";
import { usePublicSets, type CardSet } from "@loupe/core";
import { FilterPill, Skeleton, NoteCard, type FilterOption } from "@/components";
import styles from "./Sets.module.scss";

const GAME_OPTIONS: FilterOption[] = [
  { label: "Pokémon", value: "pokemon" },
  { label: "Magic", value: "magic" },
  { label: "Yu-Gi-Oh!", value: "yugioh" },
];

function year(date?: string | null): string | null {
  if (!date) return null;
  const m = /(\d{4})/.exec(date);
  return m?.[1] ?? null;
}

/**
 * Public sets explorer — browse the catalog by set (Base, Evolving Skies, …).
 * Each set links into Browse scoped to that set's cards. Pairs with the
 * set-completion progress on a card's page. Fully public.
 */
export function Sets() {
  const navigate = useNavigate();
  const [tcg, setTcg] = useState<string>("pokemon");
  const { data: sets, isLoading } = usePublicSets(tcg);

  // Newest sets first — most collectors care about recent releases.
  const ordered = useMemo(
    () =>
      [...(sets ?? [])].sort((a, b) =>
        (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""),
      ),
    [sets],
  );

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Sets</p>
        <h1 className={styles.title}>Browse by set.</h1>
        <p className={styles.sub}>
          Every set in the catalog — open one to see its cards, track completion,
          and watch the market move.
        </p>
      </header>

      <div className={styles.controls}>
        <FilterPill
          label="Game"
          options={GAME_OPTIONS}
          value={tcg}
          onChange={(v) => setTcg(v ?? "pokemon")}
        />
      </div>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} height={150} radius={14} />
          ))}
        </div>
      ) : ordered.length === 0 ? (
        <NoteCard
          title="No sets found"
          message="We couldn't load sets for this game right now. Try another game."
        />
      ) : (
        <div className={styles.grid}>
          {ordered.map((s) => (
            <SetCard
              key={s.id}
              set={s}
              onClick={() =>
                navigate(
                  `/cards?game=${encodeURIComponent(tcg)}&set=${encodeURIComponent(s.id)}`,
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SetCard({ set, onClick }: { set: CardSet; onClick: () => void }) {
  const yr = year(set.releaseDate);
  const [imgOk, setImgOk] = useState(Boolean(set.imageUrl));
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.logo}>
        {set.imageUrl && imgOk ? (
          <img
            src={set.imageUrl}
            alt={set.name}
            loading="lazy"
            onError={(_e: SyntheticEvent<HTMLImageElement>) => setImgOk(false)}
          />
        ) : (
          <Layers size={28} className={styles.logoFallback} />
        )}
      </div>
      <span className={styles.name}>{set.name}</span>
      <span className={styles.meta}>
        {[set.totalCards ? `${set.totalCards} cards` : null, yr]
          .filter(Boolean)
          .join(" · ") || "Set"}
      </span>
    </button>
  );
}
