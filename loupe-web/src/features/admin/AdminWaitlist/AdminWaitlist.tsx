import { useState } from "react";
import { Trash2, Mail, UserCheck } from "lucide-react";
import {
  useAdminWaitlist,
  useSetWaitlistStatus,
  useDeleteWaitlistEntry,
  type WaitlistEntry,
  type WaitlistStatus,
} from "@loupe/core";
import { Skeleton, NoteCard, FilterPill, type FilterOption } from "@/components";
import admin from "../admin.module.scss";
import styles from "./AdminWaitlist.module.scss";

const STATUS_LABEL: Record<WaitlistStatus, string> = {
  waiting: "Waiting",
  invited: "Invited",
  purchased: "Purchased",
  removed: "Removed",
};

const STATUS_TONE: Record<WaitlistStatus, string> = {
  waiting: "amber",
  invited: "blue",
  purchased: "mint",
  removed: "neutral",
};

const STATUS_ORDER: WaitlistStatus[] = ["waiting", "invited", "purchased", "removed"];
const STATUS_OPTIONS: FilterOption[] = STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }));

function joinedAgo(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Admin: everyone on the Loupe Scanner waitlist — review, advance, and remove. */
export function AdminWaitlist() {
  const [status, setStatus] = useState<string | null>(null);
  const { data: entries, isLoading } = useAdminWaitlist({ status: (status as WaitlistStatus) ?? undefined });
  const setStatusMut = useSetWaitlistStatus();
  const remove = useDeleteWaitlistEntry();

  const waiting = (entries ?? []).filter((e) => e.status === "waiting").length;

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Waitlist</h1>
          <p className={admin.subtitle}>
            Everyone who's reserved a Loupe Scanner. {waiting.toLocaleString()} waiting.
          </p>
        </div>
      </div>

      <div className={admin.toolbar}>
        <FilterPill label="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      </div>

      {isLoading ? (
        <div className={admin.list}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={64} radius={14} />
          ))}
        </div>
      ) : !entries || entries.length === 0 ? (
        <div className={admin.empty}>
          <NoteCard
            title="No signups yet"
            message="When collectors join the scanner waitlist, they'll show up here."
          />
        </div>
      ) : (
        <div className={admin.list}>
          {entries.map((e: WaitlistEntry) => (
            <div key={e.id} className={admin.row}>
              <div className={admin.row__main}>
                <span className={admin.row__title}>
                  {e.name || e.email}
                  {e.userId && (
                    <span className={styles.linked} title="Linked Loupe account">
                      <UserCheck size={13} /> member
                    </span>
                  )}
                </span>
                <span className={admin.row__meta}>
                  <Mail size={12} /> {e.email} · qty {e.quantity} · joined {joinedAgo(e.createdAt)}
                  {e.interest ? ` · “${e.interest}”` : ""}
                </span>
              </div>
              <div className={admin.row__actions}>
                <span className={admin.badge} data-tone={STATUS_TONE[e.status]}>
                  {STATUS_LABEL[e.status]}
                </span>
                <select
                  className={styles.select}
                  value={e.status}
                  disabled={setStatusMut.isPending}
                  onChange={(ev) =>
                    setStatusMut.mutate({ id: e.id, status: ev.target.value as WaitlistStatus })
                  }
                  aria-label={`Set status for ${e.email}`}
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Remove ${e.email}`}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Remove ${e.email} from the waitlist?`)) remove.mutate(e.id);
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
