import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";
import {
  useAnalyticsOverview,
  useGrades,
  useSealedHoldings,
  useVaultSummary,
  type GradedCard,
} from "@loupe/core";
import {
  Panel,
  Stat,
  Badge,
  CardThumb,
  Skeleton,
  NoteCard,
  Button,
  Delta,
  FilterPill,
  type FilterOption,
} from "@/components";
import { CollectionForm, gradeLabel } from "@/features/collection";
import { SealedHoldings } from "@/features/public/Sealed";
import { ProUsageBanner } from "@/pro";
import { useActiveCollection } from "@/providers/ActiveCollectionProvider";
import { formatMoney } from "@/lib/format";
import styles from "./Vault.module.scss";

type Sort = "value_desc" | "value_asc" | "grade_desc" | "grade_asc";

const SORTS: FilterOption[] = [
  { label: "Value: High to Low", value: "value_desc" },
  { label: "Value: Low to High", value: "value_asc" },
  { label: "Grade: High to Low", value: "grade_desc" },
  { label: "Grade: Low to High", value: "grade_asc" },
];

const usd = (n?: number) => (n === undefined ? "—" : formatMoney({ amount: n, currency: "USD" }));

/** The Vault — the signed-in user's graded/owned cards (live via /v1/grades). */
export function Vault() {
  const navigate = useNavigate();
  const { collectionId } = useActiveCollection();
  const [sort, setSort] = useState<Sort>("value_desc");
  const [editing, setEditing] = useState<GradedCard | null>(null);
  const { data: cards, isLoading } = useGrades({ sort, limit: 60, collectionId });
  const { data: overview } = useAnalyticsOverview(collectionId);
  const { data: summary } = useVaultSummary(collectionId);
  const { data: sealed } = useSealedHoldings({ sort: "value_desc" });
  const stats = overview?.stats;
  const items = cards ?? [];

  // Headline value + P/L come from `/v1/grades/summary` — backend-computed
  // over the WHOLE vault (the same payload mobile's home tab renders), never
  // summed from the 60-card page this screen happens to have loaded. The
  // backend also defines "collection value" (cards + unopened sealed) via
  // `combinedValueUsd`; the client-side sealed reduce is only a fallback
  // until every deployed backend ships the sealed fields.
  const sealedFallback = (sealed ?? []).reduce(
    (sum, h) => sum + (h.estimatedValue?.amount ?? 0) * (h.quantity ?? 1),
    0,
  );
  const sealedTotal = summary?.sealedValueUsd ?? sealedFallback;
  const collectionValue =
    summary?.combinedValueUsd ??
    (summary?.totalValueUsd ?? stats?.totalValueUsd ?? 0) + sealedTotal;
  const pnl = summary?.unrealizedPnlUsd ?? null;
  const pnlPct = summary?.unrealizedPnlPct ?? null;

  /** Per-card gain/loss % vs purchase price (null when no cost basis). */
  const cardPnlPct = (c: GradedCard): number | null =>
    c.purchasePriceUsd && c.purchasePriceUsd > 0 && c.estimatedValueUsd != null
      ? ((c.estimatedValueUsd - c.purchasePriceUsd) / c.purchasePriceUsd) * 100
      : null;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Collection</p>
        <h1 className={styles.title}>Your Vault</h1>
      </header>

      <ProUsageBanner />

      {stats && (
        <Panel padding="lg" raised className={styles.summary}>
          <Stat label="Collection value" value={usd(collectionValue)} />
          {sealedTotal > 0 && <Stat label="Sealed" value={usd(sealedTotal)} />}
          {pnl != null && pnlPct != null && (
            <Stat
              label="Total P/L"
              value={
                <Delta percent={pnlPct} money={{ amount: pnl, currency: "USD" }} variant="arrow" />
              }
            />
          )}
          <Stat label="Cards" value={stats.holdings.toLocaleString()} />
          <Stat label="Sets" value={stats.uniqueSets.toLocaleString()} />
          <Stat label="Avg grade" value={stats.avgGrade ? stats.avgGrade.toFixed(1) : "—"} />
        </Panel>
      )}

      <div className={styles.toolbar}>
        <span className={styles.count}>
          {isLoading
            ? "Loading…"
            : `${items.length.toLocaleString()} ${items.length === 1 ? "card" : "cards"}`}
        </span>
        <FilterPill
          label="Sort"
          options={SORTS}
          value={sort === "value_desc" ? null : sort}
          onChange={(v) => setSort((v as Sort) ?? "value_desc")}
        />
      </div>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} height={220} radius={12} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <NoteCard
          title="Your vault is empty"
          message="Browse the market and tap “Add to collection” on any card to start tracking what you own — with live valuations and P/L. You can also scan cards in the Loupe mobile app."
          action={
            <Button variant="secondary" size="sm" onClick={() => navigate("/cards")}>
              Browse the market
            </Button>
          }
        />
      ) : (
        <div className={styles.grid}>
          {items.map((c) => (
            <article key={c.id} className={styles.card}>
              <button
                type="button"
                className={styles.card__open}
                onClick={() => navigate(`/cards/${encodeURIComponent(c.cardId)}`)}
              >
                <span className={styles.media}>
                  <CardThumb src={c.cardImageUrl ?? ""} alt={c.cardName ?? "Card"} size="lg" />
                  <span className={styles.gradeBadge}>
                    <Badge tone="purple">{gradeLabel(c.house, c.grade, c.condition)}</Badge>
                  </span>
                  {c.copies && c.copies > 1 && <span className={styles.copies}>×{c.copies}</span>}
                </span>
                <span className={styles.name}>{c.cardName ?? "Card"}</span>
                {(c.cardSetName || c.cardNumber) && (
                  <span className={styles.meta}>
                    {[c.cardSetName, c.cardNumber ? `#${c.cardNumber}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
                <span className={styles.valueRow}>
                  <span className={styles.value}>{usd(c.estimatedValueUsd)}</span>
                  {cardPnlPct(c) !== null && (
                    <Delta percent={cardPnlPct(c) as number} variant="arrow" />
                  )}
                </span>
              </button>
              <button
                type="button"
                className={styles.card__manage}
                onClick={() => setEditing(c)}
                aria-label={`Manage ${c.cardName ?? "holding"}`}
              >
                <Pencil size={15} />
              </button>
            </article>
          ))}
        </div>
      )}

      {/* The user's sealed product (booster boxes, ETBs, …) — self-hides when empty. */}
      <SealedHoldings />

      {editing && (
        <CollectionForm
          mode="edit"
          holding={editing}
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </div>
  );
}
