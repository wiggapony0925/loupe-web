import type { ReactNode } from "react";
import { useFeatureFlag, useUpsertFlag } from "@loupe/core";
import { useInspectStore } from "@/stores/inspectStore";
import { useAuth } from "@/auth/AuthProvider";
import { cx } from "@/lib/cx";
import styles from "./Flaggable.module.scss";

export interface FlaggableProps {
  /** Feature-flag key controlling this region's visibility (enabled = shown). */
  flag: string;
  /** Friendly name shown on the inspect tag (defaults to the key). */
  label?: string;
  children: ReactNode;
  className?: string;
}

/**
 * The reusable state behind a hide-able region. `visible` reflects the flag
 * (default shown); `inspecting` is true only for an admin in inspect mode;
 * `toggle` flips the flag (create-or-toggle) to hide/show the region.
 */
export function useFlaggable(flag: string, label?: string) {
  const visible = useFeatureFlag(flag, true);
  const { user } = useAuth();
  const inspectingMode = useInspectStore((s) => s.inspecting);
  const inspecting = inspectingMode && Boolean(user?.is_admin);
  const upsert = useUpsertFlag();
  const toggle = () => upsert.mutate({ key: flag, input: { enabled: !visible, label: label ?? flag } });
  return { visible, inspecting, toggle, pending: upsert.isPending };
}

/**
 * Wrap any component to make it hide-able via a feature flag.
 *
 *   <Flaggable flag="cc_featured" label="Featured card"><FeaturedHero …/></Flaggable>
 *
 * Normal mode: renders children when the flag is on, nothing when off — with
 * zero extra markup. Inspect mode (admin): always renders the region with an
 * outline + a 🙈 tag that toggles the flag instantly (Figma-style).
 */
export function Flaggable({ flag, label, children, className }: FlaggableProps) {
  const { visible, inspecting, toggle, pending } = useFlaggable(flag, label);

  if (!inspecting) return visible ? <>{children}</> : null;

  return (
    <div className={cx(styles.region, !visible && styles.hidden, className)} data-flaggable>
      <button
        type="button"
        className={styles.tag}
        onClick={toggle}
        disabled={pending}
        title={visible ? "Hide this component" : "Show this component"}
      >
        <span className={styles.tag__eye}>{visible ? "🙈" : "🙉"}</span>
        <span className={styles.tag__label}>{label ?? flag}</span>
        <span className={styles.tag__state}>{visible ? "Hide" : "Hidden — show"}</span>
      </button>
      <div className={styles.region__inner} aria-hidden={!visible}>
        {children}
      </div>
    </div>
  );
}
