import { Sparkles } from "lucide-react";
import { Button } from "@/components";
import { usePro } from "./ProProvider";
import styles from "./ProUsageBanner.module.scss";

/** Show the meter only once the free user is genuinely close to the cap (80%).
 *  Below that we stay silent — no constant nagging. */
const NUDGE_AT = 0.8;

/**
 * A calm "X of 50 cards" meter for the top of the Vault. Only appears for free
 * users (when gating is on) who are nearing the limit, and never for Pro or
 * when subscriptions are off. Sells the upgrade with a fact, not fear.
 */
export function ProUsageBanner() {
  const { gatingActive, cardCount, cardLimit, openPaywall } = usePro();

  if (!gatingActive || cardLimit == null) return null;
  const ratio = cardCount / cardLimit;
  if (ratio < NUDGE_AT) return null;

  const atLimit = cardCount >= cardLimit;
  const pct = Math.min(100, Math.round(ratio * 100));

  return (
    <div className={styles.banner} data-at-limit={atLimit}>
      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.count}>
            {cardCount} of {cardLimit} cards
          </span>
          <span className={styles.note}>
            {atLimit
              ? "You've reached the free limit — go unlimited with Pro."
              : "You're close to the free limit."}
          </span>
        </div>
        <div className={styles.track} aria-hidden>
          <div className={styles.fill} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <Button
        variant={atLimit ? "primary" : "secondary"}
        size="sm"
        leadingIcon={<Sparkles size={14} />}
        onClick={() => openPaywall("card_limit")}
      >
        Upgrade
      </Button>
    </div>
  );
}
