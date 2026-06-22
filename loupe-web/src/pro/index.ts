/** Loupe Pro — entitlements provider, paywall, and the gating surfaces.
 *  The whole app reads `usePro()` to gate UI; never decide access locally. */
export { ProProvider, usePro, type PaywallReason } from "./ProProvider";
export { ProPill } from "./ProPill";
export { ProUsageBanner } from "./ProUsageBanner";
export { FREE_CARD_LIMIT } from "./proPlan";
