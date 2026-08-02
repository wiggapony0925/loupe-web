import { useMemo } from "react";
import { usePublicTrending, type CardSummary } from "@loupe/core";
import { interleaveById, pickPopulated } from "@loupe/marketing";

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
 *
 * The fallback + interleave math lives in `@loupe/marketing` so the Expo app's
 * `useMixedTrending` shapes its feed identically.
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

  const data = useMemo<CardSummary[]>(
    () =>
      interleaveById(
        [
          pickPopulated(pkT.data, pkV.data),
          pickPopulated(mgT.data, mgV.data),
          pickPopulated(ygT.data, ygV.data),
        ],
        (c) => c.id,
      ),
    [pkT.data, mgT.data, ygT.data, pkV.data, mgV.data, ygV.data],
  );

  return {
    data,
    isLoading:
      data.length === 0 &&
      (pkV.isLoading || mgV.isLoading || ygV.isLoading || pkT.isLoading),
    isError: pkV.isError && mgV.isError && ygV.isError,
  };
}
