import { useNavigate } from "react-router-dom";
import { useSetProgress, type SetProgressRow } from "@loupe/core";
import { Carousel, CardThumb } from "@/components";
import { formatCompactMoney } from "@/lib/format";
import styles from "./SetProgressRail.module.scss";

/**
 * "Set progress" — how close the collection is to completing each set, with a
 * live-priced estimate and the most valuable missing cards. This is the
 * completion view collectors actually chase and that PSA/Collectr never price
 * live. Self-hides until the user owns cards in at least one tracked set.
 */
export function SetProgressRail() {
  const navigate = useNavigate();
  const { data } = useSetProgress();
  const rows = (data ?? []).filter((s) => s.total > 0);
  if (rows.length === 0) return null;

  return (
    <Carousel
      title="Set progress"
      subtitle="How close you are to completing each set."
      itemWidth="264px"
    >
      {rows.map((s) => (
        <SetProgressCard
          key={s.setId}
          row={s}
          onOpen={(id) => navigate(`/cards/${encodeURIComponent(id)}`)}
        />
      ))}
    </Carousel>
  );
}

function SetProgressCard({
  row,
  onOpen,
}: {
  row: SetProgressRow;
  onOpen: (cardId: string) => void;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(row.percent)));
  const complete = row.owned >= row.total;
  const missing = row.missingTop ?? [];

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.name} title={row.setName}>
          {row.setName}
        </span>
        <span className={complete ? styles.pctDone : styles.pct}>{pct}%</span>
      </div>

      <div className={styles.track} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span className={styles.fill} style={{ width: `${pct}%` }} data-done={complete || undefined} />
      </div>

      <div className={styles.stats}>
        <span className={styles.count}>
          <strong>{row.owned.toLocaleString()}</strong> / {row.total.toLocaleString()} cards
        </span>
        {row.estimatedValueUsd != null && (
          <span className={styles.value}>{formatCompactMoney(row.estimatedValueUsd)}</span>
        )}
      </div>

      {missing.length > 0 && !complete && (
        <div className={styles.missing}>
          <span className={styles.missingLabel}>Top missing</span>
          <div className={styles.missingThumbs}>
            {missing.slice(0, 4).map((m) => (
              <button
                key={m.cardId}
                type="button"
                className={styles.missThumb}
                title={m.name}
                onClick={() => onOpen(m.cardId)}
              >
                <CardThumb src={m.imageUrl ?? ""} alt={m.name} size="sm" />
              </button>
            ))}
            {missing.length > 4 && (
              <span className={styles.more}>+{missing.length - 4}</span>
            )}
          </div>
        </div>
      )}

      {complete && <span className={styles.completeTag}>Set complete</span>}
    </div>
  );
}
