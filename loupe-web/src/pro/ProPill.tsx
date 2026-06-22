import { Sparkles } from "lucide-react";
import { usePro } from "./ProProvider";
import styles from "./ProPill.module.scss";

/**
 * The persistent Loupe Pro status chip in the top bar.
 *
 * • Pro members get a mint "PRO" badge (the Robinhood-Gold status marker).
 * • Free members get a tasteful "Upgrade" pill that opens the paywall.
 * • When subscriptions are switched off entirely, it renders nothing — no
 *   dangling CTA, no confusion.
 */
export function ProPill() {
  const { subscriptionsEnabled, isPro, trialing, openPaywall } = usePro();

  if (!subscriptionsEnabled) return null;

  if (isPro) {
    return (
      <span
        className={styles.badge}
        data-trial={trialing || undefined}
        title={trialing ? "Loupe Pro — free trial" : "Loupe Pro member"}
      >
        <Sparkles size={12} /> {trialing ? "TRIAL" : "PRO"}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={styles.upgrade}
      onClick={() => openPaywall("generic")}
    >
      <Sparkles size={13} /> Upgrade
    </button>
  );
}
