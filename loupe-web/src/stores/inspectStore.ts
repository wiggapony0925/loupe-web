import { create } from "zustand";

interface InspectState {
  /** Whether the Figma-style "inspect to hide" overlay is active. */
  inspecting: boolean;
  setInspecting: (value: boolean) => void;
  toggle: () => void;
}

/** Global toggle for inspect mode. Admin-only in the UI (gated where it's read).
 *  Session-scoped (not persisted) so a reload returns to the normal app. */
export const useInspectStore = create<InspectState>((set) => ({
  inspecting: false,
  setInspecting: (value) => set({ inspecting: value }),
  toggle: () => set((s) => ({ inspecting: !s.inspecting })),
}));
