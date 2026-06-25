import { Eye, X } from "lucide-react";
import { useAuth } from "./AuthProvider";
import styles from "./ImpersonationBanner.module.scss";

/** A persistent floating bar shown while this tab is impersonating a user, with
 *  a one-click exit back to the admin session. Rendered app-wide. */
export function ImpersonationBanner() {
  const { isImpersonating, impersonatingEmail, exitImpersonation } = useAuth();
  if (!isImpersonating) return null;
  return (
    <div className={styles.bar} role="status" aria-live="polite">
      <Eye size={15} />
      <span>
        Viewing as <strong>{impersonatingEmail}</strong>
      </span>
      <button type="button" className={styles.exit} onClick={exitImpersonation}>
        <X size={13} /> Exit
      </button>
    </div>
  );
}
