import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info, X, WifiOff } from "lucide-react";
import { useNoticeStore, notify, type NoticeTone } from "@/stores/noticeStore";
import styles from "./Banner.module.scss";

const ICONS: Record<NoticeTone, typeof Info> = {
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};

const OFFLINE_ID = "system:offline";

/**
 * Global notice host — fixed banners stacked at the top of the viewport for
 * any app-wide issue (session expiry, network loss, save failures…). Driven by
 * the notice store; reusable from anywhere via `notify.*` or `useNoticeStore`.
 */
export function Banner() {
  const notices = useNoticeStore((s) => s.notices);
  const dismiss = useNoticeStore((s) => s.dismiss);

  // Surface connectivity loss/restoration as a banner automatically.
  useEffect(() => {
    const onOffline = () =>
      useNoticeStore.getState().push({
        id: OFFLINE_ID,
        tone: "warning",
        message: "You're offline. Some features may not work until you reconnect.",
        dismissible: false,
      });
    const onOnline = () => {
      dismiss(OFFLINE_ID);
      notify.success("Back online.", 2500);
    };
    if (!navigator.onLine) onOffline();
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [dismiss]);

  if (notices.length === 0) return null;

  return (
    <div className={styles.host} role="region" aria-label="Notifications">
      {notices.map((n) => {
        const Icon = n.id === OFFLINE_ID ? WifiOff : ICONS[n.tone];
        return (
          <div key={n.id} className={styles.banner} data-tone={n.tone} role={n.tone === "error" ? "alert" : "status"}>
            <Icon className={styles.banner__icon} size={18} />
            <span className={styles.banner__message}>{n.message}</span>
            {n.dismissible !== false && (
              <button className={styles.banner__close} onClick={() => dismiss(n.id)} aria-label="Dismiss">
                <X size={16} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
