import { useMemo } from "react";
import { CheckCircle2, DatabaseZap, DownloadCloud, RefreshCw, XCircle } from "lucide-react";
import {
  useAdminPriceCharting,
  useAdminPriceChartingProbe,
  useAdminPriceChartingSync,
  type PriceChartingCapabilities,
  type PriceChartingTier,
} from "@loupe/core";
import { Badge, Button, NoteCard, Skeleton } from "@/components";
import { cx } from "@/lib/cx";
import styles from "./AdminPriceCharting.module.scss";
import admin from "../admin.module.scss";

type Tone = "mint" | "blue" | "amber" | "neutral";

const TIER_TONE: Record<PriceChartingTier, Tone> = {
  legendary: "mint",
  premium: "blue",
  collector: "amber",
  none: "neutral",
};

function CapBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cx(styles.cap, ok ? styles.capOn : styles.capOff)}>
      {ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {label}
    </span>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

/**
 * Developer Portal · PriceCharting.
 *
 * Shows which PriceCharting subscription tier is *live-detected* and exactly how
 * the app is pricing as a result — the whole fallback chain, with the active
 * rung lit up, plus the local bulk-mirror status. The app follows the
 * subscription automatically; "Re-probe" forces an immediate re-detect after an
 * up/downgrade, and "Sync mirror" runs the Legendary bulk import.
 */
export function AdminPriceCharting() {
  const { data, isLoading, isError } = useAdminPriceCharting();
  const probe = useAdminPriceChartingProbe();
  const sync = useAdminPriceChartingSync();

  const caps: PriceChartingCapabilities | undefined = data?.capabilities;
  const canSync = !!caps?.csvOk;

  const syncNote = useMemo(() => {
    if (sync.isPending) return "Syncing…";
    if (!sync.data) return null;
    return sync.data.ok
      ? `Synced ${sync.data.rows.toLocaleString()} products.`
      : `Not synced: ${sync.data.reason ?? "unavailable"}.`;
  }, [sync.isPending, sync.data]);

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>PriceCharting</h1>
          <p className={admin.subtitle}>
            Our primary price source. The app detects the live subscription tier and adapts
            automatically — no code changes on upgrade or downgrade.
          </p>
        </div>
        <div className={admin.toolbar}>
          <Button
            variant="secondary"
            leadingIcon={
              <RefreshCw size={15} className={probe.isPending ? styles.spin : undefined} />
            }
            onClick={() => probe.mutate()}
            disabled={probe.isPending}
          >
            {probe.isPending ? "Probing…" : "Re-probe"}
          </Button>
          <Button
            variant="primary"
            leadingIcon={<DownloadCloud size={15} />}
            onClick={() => sync.mutate()}
            disabled={!canSync || sync.isPending}
            title={
              canSync
                ? "Import the Legendary bulk CSV price guide"
                : "Available on the Legendary tier"
            }
          >
            {sync.isPending ? "Syncing…" : "Sync mirror"}
          </Button>
        </div>
      </div>

      {isError ? (
        <NoteCard
          title="PriceCharting status unavailable"
          message="Couldn't load /v1/admin/pricecharting. It'll appear once the backend is deployed with this endpoint."
        />
      ) : isLoading || !data ? (
        <div className={styles.stack}>
          <Skeleton height={132} radius={18} />
          <Skeleton height={240} radius={18} />
        </div>
      ) : (
        <div className={styles.stack}>
          {/* Current tier hero. */}
          <section className={cx(styles.hero, styles[`tone_${data.tier.key}`])}>
            <div className={styles.heroTop}>
              <span className={styles.heroKicker}>Active tier</span>
              <Badge tone={TIER_TONE[data.tier.key]} dot>
                {data.tier.label}
              </Badge>
            </div>
            <h2 className={styles.heroStrategy}>{data.strategy.label}</h2>
            <p className={styles.heroDesc}>{data.strategy.description}</p>
            <div className={styles.caps}>
              <CapBadge ok={!!caps?.apiOk} label="API" />
              <CapBadge ok={!!caps?.gradedFields} label="Graded fields" />
              <CapBadge ok={!!caps?.csvOk} label="Bulk CSV" />
            </div>
            {caps?.note ? <p className={styles.note}>{caps.note}</p> : null}
          </section>

          {/* Fallback chain. */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Fallback chain</h3>
            <p className={styles.sectionHint}>
              Best → worst. The app always resolves a price on the highest rung it currently
              qualifies for, and drops down a rung if the tier changes.
            </p>
            <ol className={styles.chain}>
              {data.fallbackChain.map((rung) => (
                <li key={rung.tier} className={cx(styles.rung, rung.active && styles.rungActive)}>
                  <div className={styles.rungHead}>
                    <span className={styles.rungLabel}>{rung.label}</span>
                    {rung.active ? (
                      <Badge tone={TIER_TONE[rung.tier]}>Active</Badge>
                    ) : (
                      <span className={styles.rungReq}>{rung.requirement}</span>
                    )}
                  </div>
                  <p className={styles.rungDesc}>{rung.strategy.description}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Local bulk mirror. */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <DatabaseZap size={16} /> Local price mirror
            </h3>
            <div className={styles.mirror}>
              <div className={styles.mirrorStat}>
                <span className={styles.mirrorNum}>{data.mirror.rows.toLocaleString()}</span>
                <span className={styles.mirrorLabel}>products mirrored</span>
              </div>
              <div className={styles.mirrorMeta}>
                <Badge tone={data.mirror.ready ? "mint" : "neutral"} dot>
                  {data.mirror.ready ? "Serving from mirror" : "Empty · using API"}
                </Badge>
                <span className={styles.mirrorSynced}>
                  Last sync: {fmtDate(data.mirror.syncedAt)}
                </span>
                {syncNote ? <span className={styles.syncNote}>{syncNote}</span> : null}
              </div>
            </div>
          </section>

          {/* Grade-field mapping. */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Grade mapping</h3>
            <p className={styles.sectionHint}>
              How PriceCharting&rsquo;s price columns map to the grade ladder we show on every card.
            </p>
            <div className={styles.gradeMap}>
              {data.gradeMap.map((g) => (
                <div key={g.field} className={styles.gradeRow}>
                  <code className={styles.gradeField}>{g.field}</code>
                  <span className={styles.gradeArrow}>→</span>
                  <span className={styles.gradeName}>{g.grade}</span>
                </div>
              ))}
            </div>
          </section>

          {caps?.probedAt ? (
            <p className={styles.footnote}>Last probed {fmtDate(caps.probedAt)}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
