import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { useGrades, useWatchlist } from "@loupe/core";
import { Panel, CardThumb, GradeBadge, Badge, Button } from "@/components";
import { formatMoney } from "@/lib/format";
import styles from "./RightRail.module.scss";

/**
 * The dashboard's right rail — the Loupe analog of the reference's "Popular
 * products" + "Comments" stacked panels. Two compact list panels: the most
 * valuable graded cards (with grade pills) and the watchlist (with a graceful
 * empty state so the rail is never blank for a signed-in user).
 */
export function RightRail() {
  const navigate = useNavigate();
  const vault = useGrades({ sort: "value_desc", limit: 6 });
  const watchlist = useWatchlist();
  const go = (id: string) => navigate(`/cards/${encodeURIComponent(id)}`);

  const vaultRows = vault.data ?? [];
  const watchRows = watchlist.data ?? [];

  return (
    <aside className={styles.rail}>
      {vaultRows.length > 0 && (
        <RailPanel
          title="Top of your vault"
          action={
            <Link to="/app/vault" className={styles.all}>
              All
            </Link>
          }
        >
          {vaultRows.map((c) => (
            <RailRow
              key={c.id}
              imageUrl={c.cardImageUrl ?? ""}
              title={c.cardName ?? "Card"}
              subtitle={c.cardSetName ?? "Graded"}
              onClick={() => go(c.cardId)}
              right={
                <>
                  <span className={styles.value}>
                    {c.estimatedValueUsd
                      ? formatMoney({ amount: c.estimatedValueUsd, currency: "USD" })
                      : "—"}
                  </span>
                  <GradeBadge
                    grade={c.grade}
                    company={c.house ? c.house.toUpperCase() : undefined}
                  />
                </>
              }
            />
          ))}
        </RailPanel>
      )}

      <RailPanel
        title="Watchlist"
        action={
          watchRows.length > 0 ? (
            <Link to="/app/watchlist" className={styles.all}>
              All
            </Link>
          ) : undefined
        }
      >
        {watchRows.length > 0 ? (
          watchRows.slice(0, 6).map((item) => (
            <RailRow
              key={item.id}
              imageUrl={item.cardImageUrl ?? ""}
              title={item.cardName ?? "Card"}
              subtitle="Tracked"
              onClick={() => go(item.cardId)}
              right={
                <Badge tone="mint" dot>
                  Watching
                </Badge>
              }
            />
          ))
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden>
              <Eye size={18} />
            </span>
            <p className={styles.emptyText}>
              Track a card&rsquo;s price by adding it to your watchlist.
            </p>
            <Button variant="secondary" size="sm" onClick={() => navigate("/cards")}>
              Find cards
            </Button>
          </div>
        )}
      </RailPanel>
    </aside>
  );
}

function RailPanel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Panel padding="none" raised className={styles.panel}>
      <div className={styles.panelHead}>
        <h3 className={styles.panelTitle}>{title}</h3>
        {action}
      </div>
      <div className={styles.list}>{children}</div>
    </Panel>
  );
}

function RailRow({
  imageUrl,
  title,
  subtitle,
  right,
  onClick,
}: {
  imageUrl: string;
  title: string;
  subtitle: string;
  right: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className={styles.row} onClick={onClick}>
      <span className={styles.thumb}>
        <CardThumb src={imageUrl} alt={title} size="sm" />
      </span>
      <span className={styles.meta}>
        <span className={styles.name}>{title}</span>
        <span className={styles.sub}>{subtitle}</span>
      </span>
      <span className={styles.right}>{right}</span>
    </button>
  );
}
