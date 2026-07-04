import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu } from "radix-ui";
import { Bell, TrendingDown, TrendingUp } from "lucide-react";
import { useAlerts } from "@loupe/core";
import { IconButton } from "@/components/IconButton/IconButton";
import { cx } from "@/lib/cx";
import styles from "./TopBar.module.scss";

const SEEN_KEY = "loupe.alerts.seen";
const MAX_ROWS = 8;

function lastSeen(): number {
  try {
    return Number(localStorage.getItem(SEEN_KEY) ?? 0);
  } catch {
    return 0;
  }
}

/**
 * The notifications bell, wired to something real: the user's fired price
 * alerts. A mint dot marks alerts that fired since the bell was last opened
 * (tracked locally); opening clears it. Rows deep-link to the card.
 */
export function NotificationsBell() {
  const navigate = useNavigate();
  const { data: alerts } = useAlerts();
  const [seenAt, setSeenAt] = useState(lastSeen);

  const fired = useMemo(
    () =>
      (alerts ?? [])
        .filter((a) => a.triggeredAt)
        .sort((a, b) => (b.triggeredAt ?? "").localeCompare(a.triggeredAt ?? ""))
        .slice(0, MAX_ROWS),
    [alerts],
  );
  const unread = fired.some((a) => Date.parse(a.triggeredAt ?? "") > seenAt);

  const markSeen = (open: boolean) => {
    if (!open) return;
    const now = Date.now();
    setSeenAt(now);
    try {
      localStorage.setItem(SEEN_KEY, String(now));
    } catch {
      /* private mode — the dot just stays session-local */
    }
  };

  return (
    <DropdownMenu.Root onOpenChange={markSeen}>
      <DropdownMenu.Trigger asChild>
        <IconButton label="Alerts" className={styles.bellWrap}>
          <Bell />
          {unread && <span className={styles.bellDot} aria-hidden />}
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.menu} align="end" sideOffset={8}>
          <div className={styles.menuHeader}>
            <span className={styles.menuName}>Price alerts</span>
          </div>
          {fired.length === 0 ? (
            <p className={styles.bellEmpty}>
              No alerts have fired yet. Set one from any card page and it
              lands here (and in your inbox) the moment the price crosses.
            </p>
          ) : (
            fired.map((a) => {
              const up = a.condition === "above";
              return (
                <DropdownMenu.Item
                  key={a.id}
                  className={styles.bellRow}
                  onSelect={() => navigate(`/cards/${encodeURIComponent(a.cardId)}`)}
                >
                  {a.cardImageUrl ? (
                    <img className={styles.bellArt} src={a.cardImageUrl} alt="" />
                  ) : (
                    <span className={cx(styles.bellArt, styles.bellArtBlank)} />
                  )}
                  <span className={styles.bellBody}>
                    <span className={styles.bellName}>{a.cardName ?? "Card"}</span>
                    <span className={cx(styles.bellMove, up ? styles.up : styles.down)}>
                      {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {a.triggeredPriceUsd != null
                        ? `$${a.triggeredPriceUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                        : "fired"}
                      <em>
                        {a.triggeredAt
                          ? new Date(a.triggeredAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : ""}
                      </em>
                    </span>
                  </span>
                </DropdownMenu.Item>
              );
            })
          )}
          <DropdownMenu.Separator className={styles.menuSep} />
          <DropdownMenu.Item
            className={styles.menuItem}
            onSelect={() => navigate("/app/watchlist")}
          >
            Manage alerts
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
