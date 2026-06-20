import { Link } from "react-router-dom";
import { Bell, Check, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useAlerts, useDeleteAlert, type PriceAlert } from "@loupe/core";
import { CardThumb, Skeleton, Badge } from "@/components";
import { formatMoney } from "@/lib/format";
import styles from "./AlertsPanel.module.scss";

/** The signed-in user's price alerts — manage + delete (real data via /v1/alerts). */
export function AlertsPanel() {
  const { data: alerts, isLoading } = useAlerts();
  const del = useDeleteAlert();

  if (isLoading) {
    return (
      <section className={styles.panel}>
        <Header count={undefined} />
        <div className={styles.list}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={64} radius={10} />
          ))}
        </div>
      </section>
    );
  }

  if (!alerts || alerts.length === 0) return null;

  return (
    <section className={styles.panel}>
      <Header count={alerts.length} />
      <div className={styles.list}>
        {alerts.map((a) => (
          <Row key={a.id} alert={a} onDelete={() => del.mutate(a.id)} deleting={del.isPending} />
        ))}
      </div>
    </section>
  );
}

function Header({ count }: { count: number | undefined }) {
  return (
    <div className={styles.head}>
      <h2 className={styles.title}>
        <Bell size={18} /> Price alerts
      </h2>
      {count != null && count > 0 && <span className={styles.count}>{count}</span>}
    </div>
  );
}

function Row({
  alert,
  onDelete,
  deleting,
}: {
  alert: PriceAlert;
  onDelete: () => void;
  deleting: boolean;
}) {
  const triggered = Boolean(alert.triggeredAt);
  const Arrow = alert.condition === "above" ? TrendingUp : TrendingDown;
  const threshold = formatMoney({ amount: alert.thresholdUsd, currency: "USD" });

  return (
    <div className={styles.row}>
      <Link to={`/cards/${encodeURIComponent(alert.cardId)}`} className={styles.link}>
        <span className={styles.thumb}>
          <CardThumb src={alert.cardImageUrl ?? ""} alt={alert.cardName ?? "Card"} size="sm" />
        </span>
        <span className={styles.meta}>
          <span className={styles.name}>{alert.cardName ?? "Card"}</span>
          <span className={styles.cond}>
            <Arrow size={13} />
            {alert.condition === "above" ? "Rises to" : "Drops to"} {threshold}
          </span>
        </span>
      </Link>
      <span className={styles.status}>
        {triggered ? (
          <Badge tone="mint">
            <Check size={12} /> Triggered
          </Badge>
        ) : (
          <Badge tone="purple">Watching</Badge>
        )}
      </span>
      <button
        className={styles.remove}
        onClick={onDelete}
        disabled={deleting}
        aria-label={`Delete alert for ${alert.cardName ?? "card"}`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
