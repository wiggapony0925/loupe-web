import { useState } from "react";
import { Search, X } from "lucide-react";
import { useAdminAudit, useAdminAuditFacets, type AuditParams } from "@loupe/core";
import { Skeleton, NoteCard, Pagination, Badge } from "@/components";
import styles from "./AdminAudit.module.scss";
import admin from "../admin.module.scss";

const PAGE_SIZE = 50;

/** Admin: read-only audit trail — every sensitive action, who did it, and when. */
export function AdminAudit() {
  const [filters, setFilters] = useState<AuditParams>({ page: 1, pageSize: PAGE_SIZE });
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, isLoading, isError } = useAdminAudit(filters);
  const { data: facets } = useAdminAuditFacets();

  const set = (patch: Partial<AuditParams>) =>
    setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const hasFilter = Boolean(filters.action || filters.targetTable || filters.actor);
  const pageCount = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Audit log</h1>
          <p className={admin.subtitle}>
            Append-only record of every admin mutation — actor, action, target, and IP.
          </p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={15} />
          <input
            placeholder="Filter by actor email…"
            value={filters.actor ?? ""}
            onChange={(e) => set({ actor: e.target.value || undefined })}
          />
        </div>
        <select
          className={styles.select}
          value={filters.action ?? ""}
          onChange={(e) => set({ action: e.target.value || undefined })}
        >
          <option value="">All actions</option>
          {facets?.actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          className={styles.select}
          value={filters.targetTable ?? ""}
          onChange={(e) => set({ targetTable: e.target.value || undefined })}
        >
          <option value="">All tables</option>
          {facets?.tables.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {hasFilter && (
          <button
            type="button"
            className={styles.reset}
            onClick={() => setFilters({ page: 1, pageSize: PAGE_SIZE })}
          >
            <X size={13} /> Clear
          </button>
        )}
        {data && <span className={styles.count}>{data.total.toLocaleString()} events</span>}
      </div>

      {isLoading ? (
        <div className={admin.list}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={44} radius={10} />
          ))}
        </div>
      ) : isError || !data ? (
        <NoteCard title="Couldn't load the audit log" message="Please refresh in a moment." />
      ) : data.results.length === 0 ? (
        <NoteCard title="No events" message="No audit entries match these filters." />
      ) : (
        <>
          <div className={styles.table}>
            <div className={styles.row} data-head>
              <span>When</span>
              <span>Actor</span>
              <span>Action</span>
              <span>Target</span>
              <span>IP</span>
            </div>
            {data.results.map((e) => {
              const open = expanded === e.id;
              const hasPayload = e.payload && Object.keys(e.payload).length > 0;
              return (
                <div key={e.id} className={styles.entry}>
                  <button
                    type="button"
                    className={styles.row}
                    data-open={open || undefined}
                    onClick={() => setExpanded(open ? null : hasPayload ? e.id : null)}
                  >
                    <time>{new Date(e.createdAt).toLocaleString()}</time>
                    <span className={styles.actor}>{e.actorEmail ?? "—"}</span>
                    <span>
                      <Badge tone="blue">{e.action}</Badge>
                    </span>
                    <span className={styles.target}>
                      {e.targetTable ?? "—"}
                      {e.targetId && <em>#{e.targetId.slice(0, 8)}</em>}
                    </span>
                    <span className={styles.ip}>{e.ipAddress ?? "—"}</span>
                  </button>
                  {open && hasPayload && (
                    <pre className={styles.payload}>{JSON.stringify(e.payload, null, 2)}</pre>
                  )}
                </div>
              );
            })}
          </div>

          <Pagination
            page={filters.page ?? 1}
            pageCount={pageCount}
            onChange={(p) => setFilters((f) => ({ ...f, page: p }))}
          />
        </>
      )}
    </div>
  );
}
