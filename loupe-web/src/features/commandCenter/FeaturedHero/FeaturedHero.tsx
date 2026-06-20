import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Panel, CardThumb, Badge, Button, CardPriceChart, Delta } from "@/components";
import { usePriceHistory, CARD_CHART_RANGE_TO_BACKEND, type CardSummary } from "@loupe/core";
import { formatMoney } from "@/lib/format";
import styles from "./FeaturedHero.module.scss";

/** Hero panel — the #1 trending card with its real, interactive price chart. */
export function FeaturedHero({ card }: { card: CardSummary }) {
  // Month series only for the headline change% chip — the chart fetches its
  // own range-aware series.
  const { data: series } = usePriceHistory(card.id, CARD_CHART_RANGE_TO_BACKEND["1M"]);
  const navigate = useNavigate();
  const open = () => navigate(`/cards/${encodeURIComponent(card.id)}`);

  return (
    <Panel padding="lg" raised className={styles.hero}>
      <div className={styles.head}>
        <button className={styles.idBtn} onClick={open} aria-label={`Open ${card.name}`}>
          <CardThumb src={card.imageUrl} alt={card.name} size="md" className={styles.thumb} />
          <span className={styles.headText}>
            <Badge tone="amber" dot>
              Trending #1
            </Badge>
            <span className={styles.name}>{card.name}</span>
            <span className={styles.set}>
              {card.setName}
              {card.number ? ` · ${card.number}` : ""}
            </span>
            <span className={styles.valueRow}>
              <span className={styles.value}>{card.price ? formatMoney(card.price) : "—"}</span>
              {series && <Delta percent={series.changePct} variant="arrow" />}
            </span>
          </span>
        </button>
        <Button variant="secondary" trailingIcon={<ArrowRight size={16} />} onClick={open}>
          View details
        </Button>
      </div>

      <CardPriceChart cardId={card.id} cardName={card.name} height={220} header={false} />
    </Panel>
  );
}
