import { useState } from "react";
import { useAdminApplications, useAdminJobs, type JobApplication } from "@loupe/core";
import { Skeleton, NoteCard, FilterPill, type FilterOption } from "@/components";
import { cx } from "@/lib/cx";
import { STATUS_LABEL, STATUS_ORDER, STATUS_TONE } from "@/features/site/applicationStatus";
import { ApplicationDrawer } from "../ApplicationDrawer/ApplicationDrawer";
import styles from "../admin.module.scss";

const STATUS_OPTIONS: FilterOption[] = STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }));

function appliedAgo(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Admin: the applicant pipeline — filter, review, and advance applications. */
export function AdminApplications() {
  const { data: jobs } = useAdminJobs();
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: apps, isLoading } = useAdminApplications({
    jobId: jobId ?? undefined,
    status: status ?? undefined,
  });

  const jobOptions: FilterOption[] = (jobs ?? []).map((j) => ({ value: j.id, label: j.title }));

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Applications</h1>
          <p className={styles.subtitle}>Everyone who's applied — review and keep them updated.</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <FilterPill label="Role" options={jobOptions} value={jobId} onChange={setJobId} />
        <FilterPill label="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      </div>

      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={64} radius={14} />
          ))}
        </div>
      ) : !apps || apps.length === 0 ? (
        <div className={styles.empty}>
          <NoteCard
            title="No applications"
            message="When candidates apply to an open role, they'll show up here."
          />
        </div>
      ) : (
        <div className={styles.list}>
          {apps.map((app: JobApplication) => (
            <button
              key={app.id}
              type="button"
              className={cx(styles.row, styles.rowButton)}
              onClick={() => setActiveId(app.id)}
            >
              <div className={styles.row__main}>
                <span className={styles.row__title}>{app.applicantName}</span>
                <span className={styles.row__meta}>
                  {app.applicantEmail} · {app.jobTitle ?? "—"} · applied {appliedAgo(app.createdAt)}
                </span>
              </div>
              <span className={styles.badge} data-tone={STATUS_TONE[app.status]}>
                {STATUS_LABEL[app.status]}
              </span>
            </button>
          ))}
        </div>
      )}

      <ApplicationDrawer
        applicationId={activeId}
        open={Boolean(activeId)}
        onOpenChange={(o) => !o && setActiveId(null)}
      />
    </div>
  );
}
