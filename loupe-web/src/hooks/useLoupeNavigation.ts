import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useConfirm } from "@/components";
import { hasScheme, isMarketplaceUrl } from "@/lib/url";

/**
 * The app's one navigation entry point — handles BOTH in-app routes and off-site
 * links so callers don't special-case them:
 *  - in-app paths (`/cards/123`) use client-side routing,
 *  - external URLs open in a new tab (`noopener`), and marketplace / listing
 *    links first show a "you're leaving Loupe" interstitial (the app-wide
 *    confirm dialog).
 *
 * Returns `{ navigate, openExternal }`. `navigate` auto-detects internal vs
 * external; `openExternal` forces the external path when you already know it's
 * an off-site URL.
 */
export function useLoupeNavigation() {
  const routerNavigate = useNavigate();
  const confirm = useConfirm();

  const openExternal = useCallback(
    async (url: string): Promise<boolean> => {
      if (isMarketplaceUrl(url)) {
        const ok = await confirm({
          title: "You're leaving Loupe",
          message:
            "This opens an external marketplace in a new tab. Loupe doesn't control its content, pricing, or sellers — double-check listings before you buy.",
          confirmLabel: "Continue",
          cancelLabel: "Stay on Loupe",
        });
        if (!ok) return false;
      }
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    },
    [confirm],
  );

  const navigate = useCallback(
    async (to: string): Promise<boolean> => {
      if (hasScheme(to)) return openExternal(to);
      void routerNavigate(to);
      return true;
    },
    [openExternal, routerNavigate],
  );

  return { navigate, openExternal };
}
