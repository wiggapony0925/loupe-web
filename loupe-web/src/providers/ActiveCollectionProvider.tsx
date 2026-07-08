/**
 * ActiveCollectionProvider — owns which portfolio (collection) the session is
 * viewing, the same way {@link DisplayCurrencyProvider} owns the currency.
 *
 * `collectionId === null` is the derived **All** view (everything owned). A
 * choice persists to localStorage for instant paint. The backend does all the
 * scoping — every value surface (dashboard summary, chart, analytics, vault)
 * simply passes this id, so switching here re-scopes the whole app.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "loupe.activeCollectionId";

interface ActiveCollectionValue {
  /** null ⇒ the "All" portfolio (everything owned). */
  collectionId: string | null;
  setCollectionId: (id: string | null) => void;
}

const ActiveCollectionContext = createContext<ActiveCollectionValue | null>(null);

export function ActiveCollectionProvider({ children }: { children: ReactNode }) {
  const [collectionId, setId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  const setCollectionId = useCallback((id: string | null) => {
    setId(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* private mode — in-memory only */
    }
  }, []);

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
