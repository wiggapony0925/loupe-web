import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useAnalyticsOverview } from "@loupe/core";
import { Panel, BarChart, type BarDatum } from "@/components";
import { formatCompactMoney } from "@/lib/format";
import styles from "./ValueBySet.module.scss";

/** Abbreviate long set names so x-axis labels stay legible. */
function shortSet(name: string): string {
  return name.length > 12 ? `${name.slice(0, 11)}…` : name;
}

/**
 * "Value by set" — where the collection's value concentrates, as a flat bar
 * chart with the heaviest set highlighted and the total faded behind. The
 * Loupe analog of the reference's product-view chart, fed by analytics
 * `setIndexes`. Self-hides until the user owns cards in a set.
 */
export function ValueBySet() {
  const navigate = useNavigate();
  const { data } = useAnalyticsOverview();
  const sets = (data?.setIndexes ?? [])
    .filter((s) => s.totalValueUsd > 0)
    .slice(0, 8);
  if (sets.length === 0) return null;

  const total = sets.reduce((sum, s) => sum + s.totalValueUsd, 0);
  const bars: BarDatum[] = sets.map((s) => ({
    label: shortSet(s.setName),
    value: s.totalValueUsd,
  }));

  return (
    <Panel padding="lg" raised className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <h2 className={styles.title}>Value by set</h2>
          <span className={styles.sub}>
            Where your collection&rsquo;s value sits.
          </span>
        </div>
        <button
          type="button"
          className={styles.link}
          onClick={() => navigate("/app/analytics")}
        >
          Analytics <ArrowUpRight size={14} />
        </button>
      </div>
      <BarChart
        data={bars}
        height={200}
        backdrop={formatCompactMoney(total)}
        format={(n) => formatCompactMoney(n)}
        ariaLabel="Collection value by set"
      />
    </Panel>
  );
}
