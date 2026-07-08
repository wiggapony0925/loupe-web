/**
 * DisplayCurrencyProvider — owns the user's display currency on the web.
 *
 * The durable source of truth is the profile (`/me/settings.currency`,
 * shared with the mobile app); localStorage keeps the last choice for
 * instant paint before the profile loads. The provider:
 *
 *   • adopts the profile's saved code whenever it changes (sign-in, or a
 *     switch made on mobile),
 *   • exposes `useDisplayCurrency()` → { code, meta, setCurrency },
 *   • `setCurrency` updates module state + localStorage and PATCHes the
 *     profile so every device follows,
 *   • re-keys its subtree on the code so every money figure re-renders —
 *     the pure `lib/format` helpers read the module-level active currency.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, useUpdateUserSettings, useUserSettings } from "@loupe/core";
import { useAuth } from "@/auth/AuthProvider";
import {
  getActiveDisplayCurrency,
  getCurrency,
  isSupportedCurrency,
  setActiveDisplayCurrency,
  setLiveFxRates,
  type CurrencyMeta,
} from "@/lib/currency";

interface DisplayCurrencyValue {
  code: string;
  meta: CurrencyMeta;
  setCurrency: (code: string) => void;
}

const DisplayCurrencyContext = createContext<DisplayCurrencyValue | null>(null);

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const { isAuthed } = useAuth();
  const { data: settings } = useUserSettings(isAuthed);
  const updateSettings = useUpdateUserSettings();
  const [code, setCode] = useState(() => getActiveDisplayCurrency().code);
  // Live FX table from the backend — the ONE conversion source shared with
  // mobile. Bumping `fxVersion` re-keys the subtree so every money figure
  // repaints with the fresh rates.
  const [fxVersion, setFxVersion] = useState(0);
  const fx = useQuery({
    queryKey: ["fx", "rates"],
    queryFn: () =>
      apiFetch<{ rates: Record<string, number> }>("/v1/market/fx/rates"),
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2,
  });
  useEffect(() => {
    const rates = fx.data?.rates;
    if (rates && Object.keys(rates).length > 0) {
      setLiveFxRates(rates);
      setFxVersion((v) => v + 1);
    }
  }, [fx.data]);

  // Adopt the profile's saved currency (set here or on mobile).
  useEffect(() => {
    const saved = settings?.currency;
    if (!saved || saved === code || !isSupportedCurrency(saved)) return;
    setActiveDisplayCurrency(saved);
    setCode(saved);
  }, [settings?.currency, code]);

  const setCurrency = useCallback(
    (next: string) => {
      if (!isSupportedCurrency(next)) return;
      setActiveDisplayCurrency(next);
      setCode(next);
      // Persist to the profile so mobile (and other sessions) follow.
      if (isAuthed) updateSettings.mutate({ currency: next });
    },
    [isAuthed, updateSettings],
  );

  return (
    <DisplayCurrencyContext.Provider value={{ code, meta: getCurrency(code), setCurrency }}>
      {/* Re-key on the code: money strings come from pure helpers, so a
          currency switch must remount the subtree to repaint every figure.
          Switches are rare (settings-page action), so this is cheap. */}
      <div style={{ display: "contents" }} key={`${code}:${fxVersion}`}>
        {children}
      </div>
    </DisplayCurrencyContext.Provider>
  );
}

/** Read + change the display currency from anywhere in the app. */
// eslint-disable-next-line react-refresh/only-export-components
export function useDisplayCurrency(): DisplayCurrencyValue {
  const ctx = useContext(DisplayCurrencyContext);
  if (!ctx) throw new Error("useDisplayCurrency must be used within <DisplayCurrencyProvider>");
  return ctx;
}
