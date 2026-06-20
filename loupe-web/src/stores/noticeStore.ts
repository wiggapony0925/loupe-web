import { create } from "zustand";

export type NoticeTone = "error" | "warning" | "info" | "success";

export interface Notice {
  id: string;
  tone: NoticeTone;
  message: string;
  /** Show a dismiss (×) button. Defaults to true. */
  dismissible?: boolean;
  /** Auto-dismiss after N ms. Omit to keep until dismissed. */
  timeoutMs?: number;
}

interface NoticeState {
  notices: Notice[];
  /** Show a banner. Returns its id (use with `dismiss`). De-dupes identical messages. */
  push: (notice: Omit<Notice, "id"> & { id?: string }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

/**
 * Global notice/banner state. No provider needed (Zustand), and reachable
 * outside React via `useNoticeStore.getState().push(...)` — so API error
 * handlers can raise a banner too. Rendered by the global <Banner/> host.
 */
export const useNoticeStore = create<NoticeState>((set, get) => ({
  notices: [],
  push: ({ id, tone, message, dismissible = true, timeoutMs }) => {
    const noticeId = id ?? `${tone}:${message}`;
    set((s) =>
      s.notices.some((n) => n.id === noticeId)
        ? s
        : { notices: [...s.notices, { id: noticeId, tone, message, dismissible, timeoutMs }] },
    );
    if (timeoutMs && timeoutMs > 0) {
      window.setTimeout(() => get().dismiss(noticeId), timeoutMs);
    }
    return noticeId;
  },
  dismiss: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
  clear: () => set({ notices: [] }),
}));

/** Imperative helper for non-React callers (e.g. API error handlers). */
export const notify = {
  error: (message: string, timeoutMs?: number) =>
    useNoticeStore.getState().push({ tone: "error", message, timeoutMs }),
  warning: (message: string, timeoutMs?: number) =>
    useNoticeStore.getState().push({ tone: "warning", message, timeoutMs }),
  info: (message: string, timeoutMs?: number) =>
    useNoticeStore.getState().push({ tone: "info", message, timeoutMs }),
  success: (message: string, timeoutMs = 4000) =>
    useNoticeStore.getState().push({ tone: "success", message, timeoutMs }),
  dismiss: (id: string) => useNoticeStore.getState().dismiss(id),
};
