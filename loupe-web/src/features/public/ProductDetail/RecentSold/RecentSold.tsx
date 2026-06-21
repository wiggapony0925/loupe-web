import { ExternalLink } from "lucide-react";
import { useCardComps } from "@loupe/core";
import { formatMoney } from "@/lib/format";
import styles from "./RecentSold.module.scss";

function soldAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const days = Math.max(0, Math.round((Date.now() - t) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

/**
 * Recent sold comps — actual recent sales (source, grade/house, price, when),
 * from `/v1/cards/{id}/comps`. The honest "what did it actually sell for"
 * companion to the live-listings prices. Renders nothing when there are none.
 */
export function RecentSold({ cardId }: { cardId: string }) {
  const { data: comps, isLoading } = useCardComps(cardId, { days: 90 });

  if (isLoading || !comps || comps.length === 0) return null;
  const rows = comps.slice(0, 8);

  return (
    <section className={styles.sold}>
      <div className={styles.sold__head}>
        <h2 className={styles.sold__title}>Recent sales</h2>
        <span className={styles.sold__sub}>Actual sold comps · last 90 days</span>
      </div>
      <div className={styles.sold__rows}>
        {rows.map((c, i) => {
          const tier = [c.house?.toUpperCase(), c.grade].filter(Boolean).join(" ");
          const Row = c.url ? "a" : "div";
          return (
            <Row
              key={`${c.source}-${i}`}
              {...(c.url
                ? { href: c.url, target: "_blank", rel: "noreferrer" }
                : {})}
              className={styles.row}
            >
              <div className={styles.row__id}>
                <span className={styles.row__title}>{c.title || "Sold listing"}</span>
                <span className={styles.row__meta}>
                  {[tier || (c.condition ?? null), c.source, soldAgo(c.soldAt)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <div className={styles.row__right}>
                <span className={styles.row__price}>{formatMoney(c.price)}</span>
                {c.url && <ExternalLink size={13} className={styles.row__icon} />}
              </div>
            </Row>
          );
        })}
      </div>
    </section>
  );
}
