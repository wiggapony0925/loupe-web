/** Loupe Pro — entitlements provider, paywall, and the gating surfaces.
 *  The whole app reads `usePro()` / `useProFeature()` / `<ProGate>` to gate
 *  UI; never decide access locally. */
export { ProProvider, usePro, type PaywallReason } from "./ProProvider";
export { useProFeature, type ProFeatureAccess } from "./useProFeature";
export { ProGate, type ProGateProps } from "./ProGate";
export { ProWall, type ProWallProps, type ProWallVariant } from "./ProWall";
export { ProPill } from "./ProPill";
export { ProUsageBanner } from "./ProUsageBanner";
export {
  FREE_CARD_LIMIT,
  PRO_PRICE_MONTHLY,
  PRO_PRICE_YEARLY,
  PRO_FEATURES,
  PRO_FEATURE_BY_KEY,
  reasonForFeature,
  type ProFeatureKey,
} from "./proPlan";
