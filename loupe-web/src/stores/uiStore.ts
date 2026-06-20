import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SidebarSide = "left" | "right";

/** Global, low-frequency UI state. Zustand needs no provider and won't cause
 *  the whole tree to re-render the way a Context value would. */
interface UiState {
  sidebarCollapsed: boolean;
  sidebarSide: SidebarSide;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarSide: (side: SidebarSide) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarSide: "left",
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setSidebarSide: (side) => set({ sidebarSide: side }),
    }),
    { name: "loupe.ui" },
  ),
);
