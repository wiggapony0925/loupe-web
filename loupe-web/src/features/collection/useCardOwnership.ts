import { useMemo } from "react";
import { useGrades, useResolvedCardId, type GradedCard } from "@loupe/core";
import { useAuth } from "@/auth/AuthProvider";

export interface CardOwnership {
  /** Every holding the signed-in user owns for this card (one row per copy). */
  owned: GradedCard[];
  /** Number of copies owned. */
  count: number;
  /** The first holding — the one "Manage" edits by default. */
  first: GradedCard | null;
  /** True while resolving the card / loading the vault. */
  isLoading: boolean;
}

/**
 * How many copies of a public (composite-id) card the signed-in user owns.
 *
 * The storefront identifies cards by composite upstream id while the vault
 * stores local UUIDs, so we resolve the public id to a local one and match it
 * against the user's grades. Only runs for signed-in users — guests own nothing.
 * Mirrors the mobile card screen's `ownedGrades` / `ownedCount`.
 */
export function useCardOwnership(publicId: string): CardOwnership {
  const { user } = useAuth();
  const enabled = Boolean(user) && Boolean(publicId);
  const resolved = useResolvedCardId(publicId, enabled);
  const grades = useGrades(undefined, enabled);

  const owned = useMemo(
    () =>
      resolved.data && grades.data ? grades.data.filter((g) => g.cardId === resolved.data) : [],
    [resolved.data, grades.data],
  );

  return {
    owned,
    count: owned.length,
    first: owned[0] ?? null,
    isLoading: enabled && (resolved.isLoading || grades.isLoading),
  };
}
