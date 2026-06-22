import { usePublicSets } from "@loupe/core";

/**
 * Resolve a `(game, set name)` to the set-drilldown URL, using the same set
 * list the Sets explorer uses — so the set-id format always matches what the
 * catalog browse expects. Returns `null` until a set matches (or no inputs),
 * so callers can render a plain label as the fallback.
 *
 * Lets card + sealed detail pages link "which set this belongs to" → that
 * set's cards in context, without needing a set id on the entity itself
 * (sealed products carry no set_id).
 */
export function useSetHref(
  tcg: string | null | undefined,
  setName: string | null | undefined,
): string | null {
  const enabled = Boolean(tcg && setName);
  const { data: sets } = usePublicSets(tcg ?? "", enabled);
  if (!enabled) return null;
  const needle = setName!.trim().toLowerCase();
  const match = (sets ?? []).find((s) => s.name.toLowerCase() === needle);
  return match
    ? `/cards?game=${encodeURIComponent(tcg!)}&set=${encodeURIComponent(match.id)}`
    : null;
}
