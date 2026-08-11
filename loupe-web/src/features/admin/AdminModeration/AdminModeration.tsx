import { Link, useSearchParams } from "react-router-dom";
import { Bot, Flag, ShieldCheck, UserCog } from "lucide-react";
import { useModerationQueue, useResolveModerationCase } from "@loupe/core";
import { Button, Panel, SectionHeader, Skeleton } from "@/components";
import { cx } from "@/lib/cx";
import { relativeTime } from "@/lib/format";
import styles from "./AdminModeration.module.scss";

/**
 * Every case lives in exactly ONE tab (the server keeps them disjoint):
 * "Blocked at post" is the machine's refusals — content that never
 * published; "Removed" is a human's decisions; "Cleared" is reviewed-fine.
 */
const TABS = [
  { key: "open", label: "Needs review" },
  { key: "blocked", label: "Blocked at post" },
  { key: "removed", label: "Removed" },
  { key: "dismissed", label: "Cleared" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/**
 * The community review queue.
 *
 * ONE list for two sources — the classifier's auto-flags and reports from
 * users. A moderator's question is "what needs me, worst first", not "which
 * system noticed"; two queues would mean two habits and one of them going
 * unread.
 *
 * Ordering is the server's (worst classifier score first, then newest), so
 * ten spare minutes get spent on the ten worst things.
 *
 * The tab rides in the URL (`?tab=blocked`) so other portal pages can link
 * straight into a filter.
 */
export function AdminModeration() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: TabKey = TABS.some((t) => t.key === raw) ? (raw as TabKey) : "open";
  const setTab = (next: TabKey) =>
    setParams(next === "open" ? {} : { tab: next }, { replace: true });
  const { data, isLoading } = useModerationQueue(tab);
  const resolve = useResolveModerationCase();

  return (
    <div className={styles.page}>
      <SectionHeader
        title="Moderation"
        subtitle="Auto-flagged content and user reports, worst first."
      />

      <nav className={styles.tabs} aria-label="Queue filter">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            aria-selected={entry.key === tab}
            className={cx(styles.tab, entry.key === tab && styles.tabOn)}
            onClick={() => setTab(entry.key)}
          >
            {entry.label}
            {entry.key === "open" && (data?.openCount ?? 0) > 0 && (
              <span className={styles.badge}>{data!.openCount}</span>
            )}
          </button>
        ))}
      </nav>

      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={120} radius={12} />
          ))}
        </div>
      ) : !data?.items.length ? (
        <Panel className={styles.empty}>
          <ShieldCheck size={22} aria-hidden />
          <div>
            <h2 className={styles.emptyTitle}>
              {tab === "open" ? "Nothing waiting" : "Nothing here"}
            </h2>
            <p className={styles.emptyBody}>
              {tab === "open"
                ? "Every report and auto-flag has been dealt with."
                : tab === "blocked"
                  ? "The classifier hasn't refused anything at post time yet."
                  : "No cases with this status yet."}
            </p>
          </div>
        </Panel>
      ) : (
        <div className={styles.list}>
          {data.items.map((row) => (
            <Panel key={row.id} className={styles.case}>
              <header className={styles.caseHead}>
                <span
                  className={cx(
                    styles.source,
                    row.source === "auto" ? styles.sourceAuto : styles.sourceUser,
                  )}
                >
                  {row.source === "auto" ? <Bot size={13} /> : <Flag size={13} />}
                  {row.source === "auto" ? "Auto" : "Reported"}
                </span>
                <span className={styles.caseTitle}>
                  {row.reasonLabel || row.reason || "Flagged"}
                </span>
                {row.score != null && (
                  // The classifier's confidence, shown because a 0.98 and a
                  // 0.56 deserve different amounts of a moderator's attention.
                  <span
                    className={cx(
                      styles.score,
                      row.score >= 0.85 && styles.scoreHigh,
                    )}
                  >
                    {Math.round(row.score * 100)}%
                  </span>
                )}
                <span className={styles.when}>{relativeTime(row.createdAt)}</span>
              </header>

              {row.excerpt && (
                // A copy taken when the case opened — the target may already
                // be gone, and "removed something, don't know what" is not a
                // reviewable record.
                <blockquote className={styles.excerpt}>{row.excerpt}</blockquote>
              )}

              {row.detail && <p className={styles.detail}>{row.detail}</p>}

              <footer className={styles.caseFoot}>
                <span className={styles.meta}>
                  {row.authorUsername ? (
                    <Link to={`/app/u/${encodeURIComponent(row.authorUsername)}`}>
                      @{row.authorUsername}
                    </Link>
                  ) : (
                    "unknown author"
                  )}
                  {row.reporterUsername && ` · reported by @${row.reporterUsername}`}
                  {row.targetType === "post" && tab !== "blocked" && (
                    <>
                      {" · "}
                      <Link to={`/app/community/p/${row.targetId}`}>view post</Link>
                    </>
                  )}
                  {row.authorUsername && (
                    // The road to a ban runs through the user admin, where
                    // it's audit-logged and reversible — this is the on-ramp,
                    // not the button.
                    <>
                      {" · "}
                      <Link
                        to={`/admin/users?q=${encodeURIComponent(row.authorUsername)}`}
                        className={styles.manage}
                      >
                        <UserCog size={12} aria-hidden /> manage account
                      </Link>
                    </>
                  )}
                </span>

                {row.status === "open" ? (
                  <span className={styles.actions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={resolve.isPending}
                      onClick={() =>
                        resolve.mutate({ id: row.id, action: "dismiss" })
                      }
                    >
                      Looks fine
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={resolve.isPending}
                      onClick={() =>
                        resolve.mutate({ id: row.id, action: "remove" })
                      }
                    >
                      Remove
                    </Button>
                  </span>
                ) : (
                  <span className={styles.resolved}>
                    {tab === "blocked"
                      ? "Blocked at post — never published"
                      : row.status === "removed"
                        ? "Removed"
                        : "Cleared"}
                    {row.resolvedAt && ` · ${relativeTime(row.resolvedAt)}`}
                  </span>
                )}
              </footer>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
