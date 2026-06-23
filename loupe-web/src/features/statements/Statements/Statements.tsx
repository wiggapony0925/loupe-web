import { useState } from "react";
import { CalendarClock, Download, FileText, Loader2, Sparkles } from "lucide-react";
import {
  api,
  ENDPOINTS,
  useGenerateReport,
  useReports,
  useUpcomingReports,
  type UpcomingReport,
  type UserReport,
} from "@loupe/core";
import { Panel, Button, Badge, Skeleton, NoteCard } from "@/components";
import { useProFeature, usePro, ProWall } from "@/pro";
import styles from "./Statements.module.scss";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function periodLabel(r: UserReport): string {
  const d = new Date(r.periodStart);
  return r.period === "yearly"
    ? String(d.getUTCFullYear())
    : `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function untilLabel(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "any moment now";
  const days = Math.ceil(ms / 86_400_000);
  if (days >= 60) return `in ~${Math.round(days / 30)} months`;
  if (days > 1) return `in ${days} days`;
  if (days === 1) return "tomorrow";
  return `in ${Math.max(1, Math.ceil(ms / 3_600_000))}h`;
}

const STATUS: Record<UserReport["status"], { tone: "mint" | "amber" | "rose"; label: string }> = {
  ready: { tone: "mint", label: "Ready" },
  pending: { tone: "amber", label: "Generating" },
  failed: { tone: "rose", label: "Failed" },
};

/**
 * Portfolio statements — an Amex/brokerage-style archive of auto-generated
 * monthly & yearly PDF statements. Shows when the next statement closes, the
 * downloadable archive, and a one-tap "generate last month" for impatient new
 * accounts. Mirrors the mobile Reports tab; reuses the shared components.
 */
export function Statements() {
  // Free users keep one statement (their latest); Pro unlocks the full archive
  // + on-demand generation. The reusable wall sells the rest.
  const { allowed, requirePro } = useProFeature("statements");
  const { entitlements } = usePro();
  const freeLimit = entitlements?.limits.free_statements ?? 1;
  const reports = useReports(true);
  const upcoming = useUpcomingReports(allowed);
  const generate = useGenerateReport();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = reports.data ?? [];
  // Free tier sees only its latest `freeLimit` statement(s); the rest are walled.
  const visibleRows = allowed ? rows : rows.slice(0, freeLimit);
  const lockedCount = allowed ? 0 : Math.max(0, rows.length - visibleRows.length);

  async function download(r: UserReport) {
    if (r.status !== "ready") return;
    setError(null);
    setBusyId(r.id);
    try {
      const { downloadUrl } = await api.reports.downloadUrl(r.id);
      if (downloadUrl) {
        window.open(downloadUrl, "_blank", "noopener");
        return;
      }
      // No presigned URL → stream the authenticated file endpoint to a blob.
      const token = localStorage.getItem("loupe.auth.token");
      const res = await fetch(ENDPOINTS.reports.file(r.id), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${r.title.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't download that statement. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  function generateLastMonth() {
    const now = new Date();
    const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    setError(null);
    generate.mutate(
      { period: "monthly", year: prev.getUTCFullYear(), month: prev.getUTCMonth() + 1 },
      { onError: () => setError("Couldn't generate that statement right now.") },
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Documents</p>
          <h1 className={styles.title}>Statements</h1>
        </div>
        <Button
          variant="secondary"
          leadingIcon={generate.isPending ? <Loader2 className={styles.spin} size={16} /> : <Sparkles size={16} />}
          disabled={generate.isPending}
          onClick={generateLastMonth}
        >
          {generate.isPending ? "Generating…" : "Generate last month"}
        </Button>
      </header>

      <p className={styles.lede}>
        Every month we close a PDF statement of your collection — value, holdings,
        movers, and grade quality — archived here to download forever, like a
        brokerage account.
      </p>

      {error && (
        <NoteCard variant="warning" title="Something went wrong" message={error} />
      )}

      {/* Upcoming close hero */}
      {upcoming.isLoading ? (
        <Skeleton height={108} radius={20} />
      ) : (
        upcoming.data && upcoming.data.length > 0 && (
          <div className={styles.upcoming}>
            {upcoming.data.map((u) => (
              <UpcomingCard key={u.period} u={u} />
            ))}
          </div>
        )
      )}

      {/* Archive */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionEyebrow}>Archive</span>
          <h2 className={styles.sectionTitle}>Your statements</h2>
        </div>

        {reports.isError ? (
          <NoteCard
            variant="warning"
            title="Couldn't load statements"
            message="The backend is unreachable right now."
            action={
              <Button variant="secondary" size="sm" onClick={() => reports.refetch()}>
                Retry
              </Button>
            }
          />
        ) : reports.isLoading ? (
          <Panel padding="none" raised className={styles.list}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skelRow}>
                <Skeleton width={140} height={16} />
                <Skeleton width={80} height={28} />
              </div>
            ))}
          </Panel>
        ) : rows.length === 0 ? (
          <Panel padding="lg" raised className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden>
              <FileText size={22} />
            </span>
            <h3 className={styles.emptyTitle}>No statements yet</h3>
            <p className={styles.emptyText}>
              Your first statement closes automatically at the start of next month.
              Want one now? Generate last month&rsquo;s above.
            </p>
          </Panel>
        ) : (
          <Panel padding="none" raised className={styles.list}>
            {visibleRows.map((r) => {
              const s = STATUS[r.status];
              return (
                <div key={r.id} className={styles.row}>
                  <span className={styles.rowIcon} aria-hidden>
                    <FileText size={18} />
                  </span>
                  <span className={styles.rowMain}>
                    <span className={styles.rowTitle}>{periodLabel(r)}</span>
                    <span className={styles.rowMeta}>
                      {r.period === "yearly" ? "Annual" : "Monthly"} ·{" "}
                      {r.generatedAt ? `Closed ${formatDate(r.generatedAt)}` : "Pending"} ·{" "}
                      {formatSize(r.fileSizeBytes)}
                    </span>
                  </span>
                  <Badge tone={s.tone} dot>
                    {s.label}
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    leadingIcon={
                      busyId === r.id ? (
                        <Loader2 className={styles.spin} size={15} />
                      ) : (
                        <Download size={15} />
                      )
                    }
                    disabled={r.status !== "ready" || busyId === r.id}
                    onClick={() => download(r)}
                  >
                    PDF
                  </Button>
                </div>
              );
            })}
          </Panel>
        )}

        {/* Free tier: latest statement is downloadable above; the full archive
            + automatic monthly closes are Pro. */}
        {!allowed && (
          <div className={styles.lockWrap}>
            <ProWall
              feature="statements"
              title={
                lockedCount > 0
                  ? `${lockedCount} more statement${lockedCount > 1 ? "s" : ""} in your archive`
                  : "Your full statement history, automated"
              }
              description="Free includes your latest statement. Loupe Pro unlocks the entire archive forever, on-demand generation, and an auto-closed PDF every month — built for insurance and capital-gains reporting."
              cta="Unlock with Pro"
              onUpgrade={() => requirePro()}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function UpcomingCard({ u }: { u: UpcomingReport }) {
  return (
    <Panel padding="lg" raised className={styles.upcomingCard}>
      <span className={styles.upcomingIcon} aria-hidden>
        <CalendarClock size={18} />
      </span>
      <div className={styles.upcomingText}>
        <span className={styles.upcomingLabel}>
          Next {u.period === "yearly" ? "annual" : "monthly"} statement
        </span>
        <span className={styles.upcomingPeriod}>{u.label}</span>
        <span className={styles.upcomingClose}>
          Closes {new Date(u.closesAt).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}{" "}
          · {untilLabel(u.closesAt)}
        </span>
      </div>
    </Panel>
  );
}
