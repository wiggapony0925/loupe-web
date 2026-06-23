import { create } from "zustand";
import { persist } from "zustand/middleware";

/** A card or sealed product the user opened — for the "Recently viewed" rail. */
export interface ViewedItem {
  id: string;
  name: string;
  imageUrl?: string | null;
  setName?: string | null;
  kind: "card" | "sealed";
}

const MAX_SEARCHES = 8;
const MAX_VIEWED = 12;

interface RecentState {
  /** Last search queries (most-recent first, deduped). Mirrors the mobile
   *  `recentSearchesStore` — both are device-local (no backend sync yet). */
  searches: string[];
  viewed: ViewedItem[];
  pushSearch: (q: string) => void;
  removeSearch: (q: string) => void;
  clearSearches: () => void;
  pushViewed: (item: ViewedItem) => void;
}

export const useRecentStore = create<RecentState>()(
  persist(
    (set) => ({
      searches: [],
      viewed: [],
      pushSearch: (q) => {
        const t = q.trim();
        if (t.length < 2) return;
        set((s) => ({
          searches: [
            t,
            ...s.searches.filter((r) => r.toLowerCase() !== t.toLowerCase()),
          ].slice(0, MAX_SEARCHES),
        }));
      },
      removeSearch: (q) =>
        set((s) => ({ searches: s.searches.filter((r) => r !== q) })),
      clearSearches: () => set({ searches: [] }),
      pushViewed: (item) =>
        set((s) => ({
          viewed: [item, ...s.viewed.filter((v) => v.id !== item.id)].slice(
            0,
            MAX_VIEWED,
          ),
        })),
    }),
    { name: "loupe.recent.v1" },
  ),
);
