/** Single source of truth for the Loupe Pro paywall copy + the free/Pro split.
 *  Mirrors the backend entitlement_service (50-card free cap) and config
 *  (display prices). Keep these in sync with `app/services/entitlement_service.py`
 *  and `Settings.pro_price_*` so marketing and billing never drift. */

import type { LucideIcon } from "lucide-react";
import { BellRing, FileText, Infinity as InfinityIcon, LineChart, ScanLine } from "lucide-react";
import type { PaywallReason } from "./ProProvider";

/** Free accounts may track this many cards (mirrors FREE_CARD_LIMIT). */
export const FREE_CARD_LIMIT = 50;

/** Fallback prices if `/me/billing/config` hasn't resolved yet. */
export const PRO_PRICE_MONTHLY = 9.99;
export const PRO_PRICE_YEARLY = 99;

export interface ProFeature {
  icon: LucideIcon;
  title: string;
  blurb: string;
}

/** What Pro unlocks — gated on *scale & automation*, never on seeing your own
 *  numbers. The order doubles as the value ladder shown in the paywall. */
export const PRO_FEATURES: ProFeature[] = [
  {
    icon: InfinityIcon,
    title: "Unlimited cards",
    blurb: `Track your whole collection — past the free ${FREE_CARD_LIMIT}-card cap.`,
  },
  {
    icon: ScanLine,
    title: "Scanner auto-import",
    blurb: "Every Loupe Scanner capture flows straight into your vault.",
  },
  {
    icon: LineChart,
    title: "Full history & analytics",
    blurb: "Deep price history, cost basis, and portfolio movers — no 30-day wall.",
  },
  {
    icon: BellRing,
    title: "Unlimited price alerts",
    blurb: "Get pinged the moment any card spikes or dips.",
  },
  {
    icon: FileText,
    title: "Tax & insurance statements",
    blurb: "One-click PDF exports for underwriting and capital-gains reporting.",
  },
];

/** Reason-aware headline so the paywall meets the user where they hit the wall. */
export function paywallHeadline(reason: PaywallReason): { title: string; sub: string } {
  switch (reason) {
    case "card_limit":
      return {
        title: `You've reached ${FREE_CARD_LIMIT} cards`,
        sub: "Go unlimited and let the entire collection live in Loupe.",
      };
    case "scanner_import":
      return {
        title: "Auto-import every scan",
        sub: "Loupe Pro syncs each Scanner capture straight to your vault.",
      };
    case "statements":
      return {
        title: "Export tax & insurance statements",
        sub: "Underwriting-ready PDFs of your vault — a Loupe Pro feature.",
      };
    case "alerts":
      return {
        title: "Never miss a move",
        sub: "Unlimited price alerts come with Loupe Pro.",
      };
    case "analytics":
      return {
        title: "See the full picture",
        sub: "Deep history and analytics are part of Loupe Pro.",
      };
    default:
      return {
        title: "Upgrade to Loupe Pro",
        sub: "Your collection, as a portfolio — unlimited, automated, insured.",
      };
  }
}
