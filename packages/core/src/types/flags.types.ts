/** Runtime feature flags. */

/** A runtime feature toggle (admin view). */
export interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  enabled: boolean;
  updatedAt?: string | null;
}

export interface FeatureFlagCreateInput {
  key: string;
  label: string;
  description?: string | null;
  enabled?: boolean;
}

export interface FeatureFlagUpdateInput {
  label?: string;
  description?: string | null;
  enabled?: boolean;
}

/** Set a flag's enabled state by key, creating it if missing (inspect overlay). */
export interface FeatureFlagUpsertInput {
  enabled: boolean;
  label?: string;
  description?: string | null;
}

/** Public `{key: enabled}` map clients gate UI on. */
export type FlagMap = Record<string, boolean>;
