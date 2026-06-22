import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBillingPortal, useEntitlements, type Entitlements } from "@loupe/core";
import { useAuth } from "@/auth/AuthProvider";
import { notify } from "@/stores/noticeStore";
import { UpgradeModal } from "./UpgradeModal";

/** Why the paywall opened — lets the modal tailor its headline. */
export type PaywallReason =
  | "card_limit"
  | "scanner_import"
  | "statements"
  | "alerts"
  | "analytics"
  | "generic";

interface ProValue {
  entitlements: Entitlements | undefined;
  /** Effective Pro access (true while entitlements load, so gates never flash). */
  isPro: boolean;
  /** True while Pro access is a free trial. */
  trialing: boolean;
  /** The global kill switch. False => monetization is off everywhere. */
  subscriptionsEnabled: boolean;
  /** True only when free-tier gating is actually in force (subs on + not Pro). */
  gatingActive: boolean;
  cardCount: number;
  /** Free-tier cap, or null when unlimited. */
  cardLimit: number | null;
  openPaywall: (reason?: PaywallReason) => void;
  closePaywall: () => void;
  /** Open the Stripe customer portal (manage / cancel) — redirects on success. */
  manageBilling: () => void;
  /** True while a portal session is being created. */
  billingBusy: boolean;
}

const ProContext = createContext<ProValue | null>(null);

/**
 * Owns Loupe Pro entitlements + the upgrade paywall. Mounted inside AuthProvider
 * so it can key the entitlements query on the session. The whole app reads
 * `usePro()` to gate UI; nothing decides access locally. When subscriptions are
 * switched off (the kill switch), everyone is Pro and every CTA disappears.
 */
export function ProProvider({ children }: { children: ReactNode }) {
  const { isAuthed } = useAuth();
  const qc = useQueryClient();
  const { data: ent } = useEntitlements(isAuthed);
  const [paywall, setPaywall] = useState<{ open: boolean; reason: PaywallReason }>({
    open: false,
    reason: "generic",
  });

  const portal = useBillingPortal({
    onSuccess: (res) => {
      if (res.url) window.location.href = res.url;
    },
    onError: () => notify.error("Couldn't open billing — please try again."),
  });

  // When Stripe redirects back after a successful checkout (?upgraded=1), the
  // webhook may still be in flight, so refresh entitlements (a couple of times)
  // and clean the URL. App-wide so it works regardless of the return page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") !== "1") return;
    const bump = () => {
      void qc.invalidateQueries({ queryKey: ["entitlements"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
    };
    bump();
    const t = setTimeout(bump, 2500);
    notify.success("Welcome to Loupe Pro — you're all set.");
    params.delete("upgraded");
    const qs = params.toString();
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (qs ? `?${qs}` : ""),
    );
    return () => clearTimeout(t);
  }, [qc]);

  // Default to *unlocked* while loading: a returning Pro user never flashes a
  // gate, and a free user sees content for the split second before the paywall
  // is even relevant. Gating only ever turns ON once entitlements confirm it.
  const isPro = ent?.is_pro ?? true;
  const subscriptionsEnabled = ent?.subscriptions_enabled ?? false;
  const gatingActive = subscriptionsEnabled && !isPro;

  const openPaywall = useCallback(
    (reason: PaywallReason = "generic") => {
      // Nothing to sell if monetization is off or the user is already Pro.
      if (ent && (!ent.subscriptions_enabled || ent.is_pro)) return;
      setPaywall({ open: true, reason });
    },
    [ent],
  );
  const closePaywall = useCallback(
    () => setPaywall((p) => ({ ...p, open: false })),
    [],
  );

  const manageBilling = useCallback(() => portal.mutate(), [portal]);

  const value = useMemo<ProValue>(
    () => ({
      entitlements: ent,
      isPro,
      trialing: ent?.trialing ?? false,
      subscriptionsEnabled,
      gatingActive,
      cardCount: ent?.card_count ?? 0,
      cardLimit: ent?.limits.max_cards ?? null,
      openPaywall,
      closePaywall,
      manageBilling,
      billingBusy: portal.isPending,
    }),
    [
      ent,
      isPro,
      subscriptionsEnabled,
      gatingActive,
      openPaywall,
      closePaywall,
      manageBilling,
      portal.isPending,
    ],
  );

  return (
    <ProContext.Provider value={value}>
      {children}
      <UpgradeModal
        open={paywall.open}
        reason={paywall.reason}
        onOpenChange={(o) => setPaywall((p) => ({ ...p, open: o }))}
      />
    </ProContext.Provider>
  );
}

/** Access Loupe Pro state + the paywall opener from anywhere in the app. */
// eslint-disable-next-line react-refresh/only-export-components
export function usePro(): ProValue {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error("usePro must be used within <ProProvider>");
  return ctx;
}
