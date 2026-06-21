import { CardThumb } from "@/components/CardThumb/CardThumb";
import { GradeBadge } from "@/components/Badge/Badge";
import { Sparkline } from "@/components/Sparkline/Sparkline";
import { Delta } from "@/components/Delta/Delta";
import { formatMoney } from "@/lib/format";
import type { Money } from "@loupe/core";
import styles from "./SparkRow.module.scss";

export interface SparkRowProps {
  imageUrl: string;
  title: string;
  subtitle: string;
  sparkline: number[];
  /** Optional so the row works for catalog cards without a resolved price. */
  price?: Money;
  changePct: number;
  grade?: number;
  gradeCompany?: string;
  quantity?: number;
  onClick?: () => void;
}

/**
 * The canonical "card + graph summary line" — one art + sparkline + price pill.
 * Shared by the vault (positions) and the Command Center (Top Movers) so both
 * rails are visually identical, exactly like the RN app's PositionRow/MoverSparkRow.
 */
export function SparkRow({
  imageUrl,
  title,
  subtitle,
  sparkline,
  price,
  changePct,
  grade,
  gradeCompany,
  quantity,
  onClick,
}: SparkRowProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={styles.row} onClick={onClick} type={onClick ? "button" : undefined}>
      <CardThumb src={imageUrl} alt={title} size="md" />

      <div className={styles.meta}>
        <div className={styles.titleLine}>
          <span className={styles.title}>{title}</span>
          {grade !== undefined && <GradeBadge grade={grade} company={gradeCompany} />}
        </div>
        <span className={styles.subtitle}>
          {subtitle}
          {quantity && quantity > 1 ? ` · ×${quantity}` : ""}
        </span>
      </div>

      <div className={styles.spark}>
        <Sparkline data={sparkline} width={104} height={36} />
      </div>

      <div className={styles.price}>
        <span className={styles.amount}>{price ? formatMoney(price) : "—"}</span>
        <Delta percent={changePct} />
      </div>
    </Tag>
  );
}
