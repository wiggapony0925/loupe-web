import { Layers, Library, ScanLine, DollarSign } from "lucide-react";
import { useAdminCatalog } from "@loupe/core";
import { Skeleton, NoteCard, MetricCard, Panel, Badge } from "@/components";
import styles from "./AdminCatalog.module.scss";
import admin from "../admin.module.scss";

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

/** Admin: catalog coverage — how much data backs each game, scanner-readiness
 *  (pHash %), and where prices come from. Read-only. */
export function AdminCatalog() {
  const { data: c, isLoading, isError } = useAdminCatalog();

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Catalog</h1>
          <p className={admin.subtitle}>
            Coverage by game, scanner-readiness (perceptual hash), and price sources.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.metrics}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={120} radius={20} />
          ))}
        </div>
      ) : isError || !c ? (
        <NoteCard title="Couldn't load catalog" message="Please refresh in a moment." />
      ) : (
        <>
          <div className={styles.metrics}>
            <MetricCard
              accent
              tone="mint"
              icon={<Library size={16} />}
              label="Cards"
              value={c.totalCards.toLocaleString()}
              caption={`${c.totalSets.toLocaleString()} sets`}
            />
            <MetricCard
              tone="blue"
              icon={<ScanLine size={16} />}
              label="Scanner-ready"
              value={pct(c.phashCoveragePct)}
              caption="Cards with a pHash"
            />
            <MetricCard
              tone="purple"
              icon={<Layers size={16} />}
              label="Games backed"
              value={`${c.games.filter((g) => g.backed).length}/${c.games.length}`}
              caption="Have catalog data"
            />
            <MetricCard
              tone="amber"
              icon={<DollarSign size={16} />}
              label="Price snapshots"
              value={c.priceSnapshots.toLocaleString()}
              caption={
                Object.keys(c.priceBySource).length
                  ? `${Object.keys(c.priceBySource).length} sources`
                  : "None stored"
              }
            />
          </div>

          <Panel padding="lg" raised>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Cards</th>
                  <th>Sets</th>
                  <th>Scanner-ready</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {c.games.map((g) => (
                  <tr key={g.tcg}>
                    <td className={styles.game}>{g.label}</td>
                    <td className={styles.num}>{g.cards.toLocaleString()}</td>
                    <td className={styles.num}>{g.sets.toLocaleString()}</td>
                    <td className={styles.num}>{g.cards ? pct(g.phashPct) : "—"}</td>
                    <td>
                      {!g.backed ? (
                        <Badge tone="amber">Scaffolded</Badge>
                      ) : g.sets > 0 && g.cards < g.sets ? (
                        <Badge tone="neutral">Sets &gt; cards</Badge>
                      ) : (
                        <Badge tone="mint">Backed</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          {Object.keys(c.priceBySource).length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.section__label}>Price sources</h2>
              <div className={styles.chips}>
                {Object.entries(c.priceBySource).map(([src, n]) => (
                  <span key={src} className={styles.chip}>
                    {src}
                    <strong>{n.toLocaleString()}</strong>
                  </span>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
