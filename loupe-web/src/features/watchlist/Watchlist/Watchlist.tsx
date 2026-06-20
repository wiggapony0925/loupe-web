import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { api, useWatchlist } from "@loupe/core";
import { CardThumb, Skeleton, NoteCard, Button } from "@/components";
import { AlertsPanel } from "../AlertsPanel/AlertsPanel";
import styles from "./Watchlist.module.scss";

/** The signed-in user's pinned cards (real data via /v1/watchlist). */
export function Watchlist() {
  const { data: items, isLoading } = useWatchlist();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: (cardId: string) => api.watchlist.remove(cardId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });

  return (
    <div className={styles.watchlist}>
      <div className={styles.watchlist__head}>
        <h1 className={styles.watchlist__title}>Watchlist</h1>
        {items && items.length > 0 && (
          <span className={styles.watchlist__count}>{items.length} pinned</span>
        )}
      </div>

      {isLoading ? (
        <div className={styles.watchlist__grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={150} radius={10} />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <NoteCard
          title="No cards yet"
          message="Open any card and tap “Add to watchlist” to track its price here."
          action={
            <Button variant="secondary" size="sm" onClick={() => navigate("/cards")}>
              Browse cards
            </Button>
          }
        />
      ) : (
        <div className={styles.watchlist__grid}>
          {items.map((item) => (
            <div key={item.id} className={styles.watchlist__card}>
              <Link to={`/cards/${encodeURIComponent(item.cardId)}`} className={styles.watchlist__link}>
                <span className={styles.watchlist__thumb}>
                  <CardThumb src={item.cardImageUrl ?? ""} alt={item.cardName ?? "Card"} size="lg" />
                </span>
                <span className={styles.watchlist__name}>{item.cardName ?? "Card"}</span>
              </Link>
              <button
                className={styles.watchlist__remove}
                onClick={() => remove.mutate(item.cardId)}
                disabled={remove.isPending}
                aria-label={`Remove ${item.cardName ?? "card"} from watchlist`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <AlertsPanel />
    </div>
  );
}
