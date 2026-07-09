/**
 * ActiveCollectionProvider — owns which portfolio (collection) the session is
 * viewing, the same way {@link DisplayCurrencyProvider} owns the currency.
 *
 * `collectionId === null` is the derived **All** view (everything owned). The
 * durable source of truth is the profile (`/me/settings.active_collection_id`,
 * shared with the mobile app); localStorage keeps the last choice for instant
 * paint before the profile loads. The provider:
 *
 *   • adopts the profile's saved id whenever it changes (sign-in, or a switch
 *     made on mobile),
 *   • `setCollectionId` updates state + localStorage and PATCHes the profile so
 *     every device follows.
 *
 * The backend does all the scoping — every value surface (dashboard summary,
 * chart, analytics, vault) simply passes this id.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useUpdateUserSettings, useUserSettings } from "@loupe/core";
import { useAuth } from "@/auth/AuthProvider";

const STORAGE_KEY = "loupe.activeCollectionId";

interface ActiveCollectionValue {
  /** null ⇒ the "All" portfolio (everything owned). */
  collectionId: string | null;
  setCollectionId: (id: string | null) => void;
}

const ActiveCollectionContext = createContext<ActiveCollectionValue | null>(null);

export function ActiveCollectionProvider({ children }: { children: ReactNode }) {
  const { isAuthed } = useAuth();
  const { data: settings } = useUserSettings(isAuthed);
  const updateSettings = useUpdateUserSettings();
  const [collectionId, setId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  // Adopt the profile's saved portfolio (set here or on mobile). `undefined`
  // settings = not loaded; `null` id = the server's "All".
  useEffect(() => {
    if (!settings) return;
    const saved = settings.active_collection_id ?? null;
    if (saved === collectionId) return;
    setId(saved);
    try {
      if (saved) localStorage.setItem(STORAGE_KEY, saved);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* private mode — in-memory only */
    }
  }, [settings, collectionId]);

  const setCollectionId = useCallback(
    (id: string | null) => {
      setId(id);
      try {
        if (id) localStorage.setItem(STORAGE_KEY, id);
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* private mode — in-memory only */
      }
      // Persist to the profile so mobile (and other sessions) follow.
      if (isAuthed) updateSettings.mutate({ active_collection_id: id });
    },
    [isAuthed, updateSettings],
  );

  const value = useMemo(() => ({ collectionId, setCollectionId }), [collectionId, setCollectionId]);

  return (
    <ActiveCollectionContext.Provider value={value}>{children}</ActiveCollectionContext.Provider>
  );
}

/** Read + change the active portfolio from anywhere in the app. */
// eslint-disable-next-line react-refresh/only-export-components
export function useActiveCollection(): ActiveCollectionValue {
  const ctx = useContext(ActiveCollectionContext);
  if (!ctx) throw new Error("useActiveCollection must be used within <ActiveCollectionProvider>");
  return ctx;
}
