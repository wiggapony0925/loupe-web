import type { ReactNode } from "react";
import { useFeatureFlag } from "@loupe/core";

export interface FeatureGateProps {
  /** Feature-flag key. Shows `children` when the flag is on. */
  flag: string;
  /** Rendered when the flag is off. Defaults to nothing. */
  fallback?: ReactNode;
  children: ReactNode;
}

/** Conditionally renders its children based on a backend feature flag. Lets
 *  admins hide pages, components, and whole micro-apps without a deploy. */
export function FeatureGate({ flag, fallback = null, children }: FeatureGateProps) {
  const on = useFeatureFlag(flag);
  return <>{on ? children : fallback}</>;
}
