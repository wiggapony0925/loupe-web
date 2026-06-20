import { useMemo } from "react";
import { usePublicTrending, type CardSummary } from "@loupe/core";

/**
 * A reliably *mixed* trending feed — round-robins Pokémon · Magic · Yu-Gi-Oh!
 * so a rail never collapses to a single game.
 *
 * The `tcg=all` feed (and even per-game `sort=trending`) collapses when an
 * upstream times out — Pokémon/Yu-Gi-Oh trending frequently return nothing
 * while Magic's does. Each game's `sort=value` feed *is* reliable, so we use
 * it as a per-game fallback: prefer the requested sort, fall back to value,
 * then interleave. All queries are cached + deduped by TanStack, so sharing
 * this across the hero + carousels costs nothing extra.
 */
export function useMixedTrending(sort: "trending" | "value", perTcg = 8) {
  const pkT = usePublicTrending({ tcg: "pokemon", sort, limit: perTcg });
  const mgT = usePublicTrending({ tcg: "magic", sort, limit: perTcg });
  const ygT = usePublicTrending({ tcg: "yugioh", sort, limit: perTcg });
  // Reliable fallback (deduped to the same query when sort is already "value").
  const pkV = usePublicTrending({
    tcg: "pokemon",
    sort: "value",
    limit: perTcg,
  });
  const mgV = usePublicTrending({ tcg: "magic", sort: "value", limit: perTcg });
  const ygV = usePublicTrending({
    tcg: "yugioh",
    sort: "value",
    limit: perTcg,
  });

  const data = useMemo<CardSummary[]>(() => {
    const pick = (primary?: CardSummary[], fallback?: CardSummary[]) =>
      primary && primary.length > 0 ? primary : (fallback ?? []);
    const lists = [
      pick(pkT.data, pkV.data),
      pick(mgT.data, mgV.data),
      pick(ygT.data, ygV.data),
    ];
    const out: CardSummary[] = [];
    const seen = new Set<string>();
    const max = Math.max(0, ...lists.map((l) => l.length));
    for (let i = 0; i < max; i++) {
      for (const list of lists) {
        const card = list[i];
        if (card && !seen.has(card.id)) {
          seen.add(card.id);
          out.push(card);
        }
      }
    }
    return out;
  }, [pkT.data, mgT.data, ygT.data, pkV.data, mgV.data, ygV.data]);

  return {
    data,
    isLoading:
      data.length === 0 &&
      (pkV.isLoading || mgV.isLoading || ygV.isLoading || pkT.isLoading),
    isError: pkV.isError && mgV.isError && ygV.isError,
  };
}
