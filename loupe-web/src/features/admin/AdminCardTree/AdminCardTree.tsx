import type { ReactNode } from "react";
import { ArrowRight, Database, DollarSign, KeyRound, Tag } from "lucide-react";
import { useAdminCardTree } from "@loupe/core";
import { Skeleton, NoteCard, Panel, Badge } from "@/components";
import admin from "../admin.module.scss";
import styles from "./AdminCardTree.module.scss";

/**
 * Admin: the "Card Tree" — a family tree of where every field of a card (and a
 * set) gets its data. Each game routes to one catalog provider for identity
 * (name / set / art), and price resolves through an ordered fallback chain.
 * Reads /v1/admin/card-tree, generated from the backend lineage registry, so it
 * always matches the code.
 */
export function AdminCardTree() {
  const { data: t, isLoading, isError } = useAdminCardTree();

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Card Tree</h1>
          <p className={admin.subtitle}>
            The family tree of a Loupe card: which API feeds the name, set, and
            art per game, and the ordered fallback chain that resolves its price.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.skeletons}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={120} radius={20} />
          ))}
        </div>
      ) : isError || !t ? (
        <NoteCard
          title="Couldn't load the card tree"
          message="Please refresh in a moment."
        />
      ) : (
        <>
          <Section title="Where each card's data comes from">
            <div className={styles.games}>
              {t.games.map((g) => (
                <div key={g.tcg} className={styles.gameRow}>
                  <div className={styles.gameNode}>
                    <span className={styles.gameLabel}>{g.label}</span>
                    <span className={styles.gameKey}>{g.tcg}</span>
                  </div>
                  <ArrowRight size={16} className={styles.connector} />
                  <div className={styles.branches}>
                    <div className={styles.branch}>
                      <Database size={14} />
                      <span className={styles.branchKind}>identity</span>
                      <Badge tone="mint">{g.catalog_label}</Badge>
                      <span className={styles.branchNote}>
                        name · set · art · rarity · number
                      </span>
                    </div>
                    <div className={styles.branch}>
                      <DollarSign size={14} />
                      <span className={styles.branchKind}>price</span>
                      <Badge>{g.price}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Price fallback chain"
            subtitle="The first source with a price wins, then it falls through in order — so a card always shows a price if any source has one."
          >
            <ol className={styles.chain}>
              {t.price_chain.map((step) => (
                <li key={step.id} className={styles.chainStep}>
                  <span className={styles.chainOrder}>{step.order}</span>
                  <span className={styles.chainId}>{step.id}</span>
                  <Badge tone={step.configured ? "mint" : "neutral"}>
                    {step.configured ? "live" : "off"}
                  </Badge>
                </li>
              ))}
            </ol>
          </Section>

          <div className={styles.models}>
            <Section title="Unified Card model">
              <FieldList fields={t.card_model.fields} />
            </Section>
            <Section title="Unified Set model">
              <FieldList fields={t.set_model.fields} />
            </Section>
          </div>

          <Section
            title="Catalog sources"
            subtitle="One entry per provider — add a card API here to light up a new game."
          >
            <div className={styles.sources}>
              {t.catalog_sources.map((s) => (
                <a
                  key={s.id}
                  className={styles.source}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className={styles.sourceHead}>
                    <span className={styles.sourceLabel}>{s.label}</span>
                    {s.key_required && (
                      <KeyRound size={13} className={styles.sourceKey} />
                    )}
                  </div>
                  <div className={styles.sourceGames}>
                    {s.games.map((g) => (
                      <Badge key={g}>{g}</Badge>
                    ))}
                  </div>
                  <span className={styles.sourcePrice}>
                    {s.embedded_price ? "embedded price" : "no price (uses chain)"}
                  </span>
                </a>
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {subtitle && <p className={styles.sectionSub}>{subtitle}</p>}
      <Panel padding="lg" raised>
        {children}
      </Panel>
    </section>
  );
}

function FieldList({
  fields,
}: {
  fields: { field: string; from: string; note: string }[];
}) {
  const toneFor = (from: string): "mint" | "amber" | "neutral" =>
    from === "price-chain" ? "amber" : from === "catalog" ? "mint" : "neutral";
  return (
    <ul className={styles.fields}>
      {fields.map((f) => (
        <li key={f.field} className={styles.field}>
          <span className={styles.fieldName}>
            <Tag size={12} /> {f.field}
          </span>
          <Badge tone={toneFor(f.from)}>{f.from}</Badge>
          <span className={styles.fieldNote}>{f.note}</span>
        </li>
      ))}
    </ul>
  );
}
