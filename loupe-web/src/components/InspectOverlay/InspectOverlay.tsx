import { ScanSearch, EyeOff } from "lucide-react";
import { useInspectStore } from "@/stores/inspectStore";
import { useAuth } from "@/auth/AuthProvider";
import { cx } from "@/lib/cx";
import styles from "./InspectOverlay.module.scss";

/**
 * Figma-style inspect mode. Admin-only floating control: toggle on, then every
 * <Flaggable> region shows a 🙈 tag you can click to hide it (flips a feature
 * flag instantly). Rendered globally so it works on any page.
 */
export function InspectOverlay() {
  const { user } = useAuth();
  const inspecting = useInspectStore((s) => s.inspecting);
  const toggle = useInspectStore((s) => s.toggle);
  const setInspecting = useInspectStore((s) => s.setInspecting);

  if (!user?.is_admin) return null;

  return (
    <>
      <button
        type="button"
        className={cx(styles.fab, inspecting && styles.fab_active)}
        onClick={toggle}
        aria-pressed={inspecting}
        title={inspecting ? "Exit inspect mode" : "Inspect & hide components"}
      >
        {inspecting ? <EyeOff size={18} /> : <ScanSearch size={18} />}
        <span>{inspecting ? "Exit inspect" : "Inspect"}</span>
      </button>

      {inspecting && (
        <div className={styles.bar} role="status">
          <span className={styles.bar__eye}>🙈</span>
          <span className={styles.bar__text}>
            Inspect mode — click a component's tag to hide it. Changes save to feature flags instantly.
          </span>
          <a className={styles.bar__link} href="/admin/flags">
            Manage flags
          </a>
          <button type="button" className={styles.bar__done} onClick={() => setInspecting(false)}>
            Done
          </button>
        </div>
      )}
    </>
  );
}
