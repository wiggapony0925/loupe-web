import {
  Cloud,
  Server,
  Database,
  GitCommitHorizontal,
  ExternalLink,
} from "lucide-react";
import {
  useAdminCloud,
  useAdminCloudLogs,
  type CloudService,
} from "@loupe/core";
import { Skeleton, NoteCard, Badge } from "@/components";
import styles from "./AdminCloud.module.scss";
import admin from "../admin.module.scss";

const STATUS_TONE: Record<CloudService["status"], "mint" | "amber" | "rose" | "neutral"> = {
  ready: "mint",
  deploying: "amber",
  error: "rose",
  unknown: "neutral",
};

/** Admin: read-only Google Cloud — Cloud Run services, deployed SHA, and Cloud SQL. */
export function AdminCloud() {
  const { data, isLoading } = useAdminCloud();
  const { data: logs } = useAdminCloudLogs(25, Boolean(data?.configured));

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Google Cloud</h1>
          <p className={admin.subtitle}>
            What&rsquo;s deployed where — Cloud Run revisions, commit SHA, and Cloud SQL. Read-only.
          </p>
        </div>
        {data?.projectId && (
          <div className={styles.project}>
            <Cloud size={15} />
            {data.projectId} · {data.region}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className={styles.services}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={120} radius={16} />
          ))}
        </div>
      ) : !data ? (
        <NoteCard title="Couldn't load cloud status" message="Please refresh in a moment." />
      ) : (
        <>
          {!data.configured && (
            <NoteCard
              title="Google Cloud not connected"
              message={data.detail}
            />
          )}

          {data.services.length > 0 && (
            <div className={styles.services}>
              {data.services.map((s) => (
                <div key={s.name} className={styles.service}>
                  <div className={styles.service__head}>
                    <Server size={16} />
                    <span className={styles.service__name}>{s.name}</span>
                    <Badge tone={STATUS_TONE[s.status]} dot>
                      {s.status}
                    </Badge>
                  </div>
                  <dl className={styles.kv}>
                    {s.revision && (
                      <div>
                        <dt>Revision</dt>
                        <dd>{s.revision}</dd>
                      </div>
                    )}
                    {s.commitSha && (
                      <div>
                        <dt>Commit</dt>
                        <dd className={styles.sha}>
                          <GitCommitHorizontal size={12} />
                          {s.commitSha.slice(0, 8)}
                        </dd>
                      </div>
                    )}
                    {s.updatedAt && (
                      <div>
                        <dt>Updated</dt>
                        <dd>{new Date(s.updatedAt).toLocaleString()}</dd>
                      </div>
                    )}
                  </dl>
                  {s.url && (
                    <a className={styles.service__link} href={s.url} target="_blank" rel="noreferrer">
                      {s.url.replace(/^https?:\/\//, "")} <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {data.sqlInstances.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.section__label}>Cloud SQL</h2>
              <div className={styles.sql}>
                {data.sqlInstances.map((db) => (
                  <div key={db.name} className={styles.sqlRow}>
                    <Database size={15} />
                    <span className={styles.sqlRow__name}>{db.name}</span>
                    {db.region && <span className={styles.sqlRow__region}>{db.region}</span>}
                    <Badge tone="neutral">{db.state}</Badge>
                  </div>
                ))}
              </div>
            </section>
          )}

          {logs && logs.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.section__label}>Recent logs</h2>
              <div className={styles.logs}>
                {logs.map((l, i) => (
                  <div key={i} className={styles.log} data-sev={l.severity.toLowerCase()}>
                    <time>{new Date(l.timestamp).toLocaleTimeString()}</time>
                    <span className={styles.log__sev}>{l.severity}</span>
                    {l.service && <span className={styles.log__svc}>{l.service}</span>}
                    <span className={styles.log__msg}>{l.message}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
