import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bell, X } from "lucide-react";
import { useAlerts, useDeleteAlert, useSetProgress } from "@loupe/core";
import { useAuth } from "@/auth/AuthProvider";
import { CardThumb } from "@/components";
import styles from "./CardContext.module.scss";

/* ── Active price alerts the user has on this card ───────────────────── */

export function ActiveAlerts({
  cardId,
  cardName,
}: {
  cardId: string;
  cardName: string;
}) {
  const { user } = useAuth();
  const { data: alerts } = useAlerts(true, Boolean(user));
  const del = useDeleteAlert();

  const mine = useMemo(
    () =>
      (alerts ?? []).filter(
        (a) =>
          a.triggeredAt === null &&
          (a.cardId === cardId || (a.cardName != null && a.cardName === cardName)),
      ),
    [alerts, cardId, cardName],
  );

  if (!user || mine.length === 0) return null;

  return (
    <section className={styles.alerts}>
      <h3 className={styles.alerts__title}>Your alerts</h3>
      <div className={styles.alerts__row}>
        {mine.map((a) => (
          <span key={a.id} className={styles.alert}>
            <Bell size={11} />
            {a.condition === "above" ? "≥" : "≤"} $
            {a.thresholdUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <button
              type="button"
              className={styles.alert__del}
              aria-label="Delete alert"
              onClick={() => del.mutate(a.id)}
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
    </section>
  );
}

/* ── Set-completion progress for this card's set ─────────────────────── */

export function SetProgressForCard({ setName }: { setName: string | undefined }) {
  const { user } = useAuth();
  const { data: rows } = useSetProgress(Boolean(user));

  const row = useMemo(() => {
    if (!setName) return undefined;
    const target = setName.trim().toLowerCase();
    return (rows ?? []).find((r) => r.setName.trim().toLowerCase() === target);
  }, [rows, setName]);

  if (!user || !row) return null;

  const pct = Math.max(0, Math.min(100, row.percent));
  const tone =
    pct >= 75 ? "var(--accent-mint)" : pct >= 25 ? "var(--accent-amber)" : "var(--accent-rose)";

  return (
    <section className={styles.set}>
      <div className={styles.set__head}>
        <div className={styles.set__id}>
          <span className={styles.set__eyebrow}>Set progress</span>
          <span className={styles.set__name}>{row.setName}</span>
        </div>
        <span className={styles.set__pct} style={{ color: tone }}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className={styles.set__bar}>
        <span className={styles.set__fill} style={{ width: `${pct}%`, background: tone }} />
      </div>
      <span className={styles.set__count}>
        {row.owned} of {row.total} owned
      </span>
      {row.missingTop.length > 0 && (
        <div className={styles.set__missing}>
          <span className={styles.set__eyebrow}>Still missing</span>
          <div className={styles.set__thumbs}>
            {row.missingTop.slice(0, 6).map((m) => (
              <Link
                key={m.cardId}
                to={`/cards/${encodeURIComponent(m.cardId)}`}
                className={styles.set__thumb}
                aria-label={`Open ${m.name}`}
              >
                <CardThumb src={m.imageUrl ?? ""} alt={m.name} size="sm" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
