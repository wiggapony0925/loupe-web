import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";
import { useAnalyticsOverview, useGrades, type GradedCard } from "@loupe/core";
import { Panel, Stat, Badge, CardThumb, Skeleton, NoteCard, Button, FilterPill, type FilterOption } from "@/components";
import { CollectionForm, gradeLabel } from "@/features/collection";
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
  const [sort, setSort] = useState<Sort>("value_desc");
  const [editing, setEditing] = useState<GradedCard | null>(null);
  const { data: cards, isLoading } = useGrades({ sort, limit: 60 });
  const { data: overview } = useAnalyticsOverview();
  const stats = overview?.stats;
  const items = cards ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Collection</p>
        <h1 className={styles.title}>Your Vault</h1>
      </header>

      {stats && (
        <Panel padding="lg" raised className={styles.summary}>
          <Stat label="Collection value" value={usd(stats.totalValueUsd)} />
          <Stat label="Cards" value={stats.holdings.toLocaleString()} />
          <Stat label="Sets" value={stats.uniqueSets.toLocaleString()} />
          <Stat label="Avg grade" value={stats.avgGrade ? stats.avgGrade.toFixed(1) : "—"} />
        </Panel>
      )}

      <div className={styles.toolbar}>
        <span className={styles.count}>
          {isLoading ? "Loading…" : `${items.length.toLocaleString()} ${items.length === 1 ? "card" : "cards"}`}
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
                    {[c.cardSetName, c.cardNumber ? `#${c.cardNumber}` : null].filter(Boolean).join(" · ")}
                  </span>
                )}
                <span className={styles.value}>{usd(c.estimatedValueUsd)}</span>
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
