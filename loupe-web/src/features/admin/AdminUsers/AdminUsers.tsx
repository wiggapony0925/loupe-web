import { useState } from "react";
import { Search, ShieldCheck, Shield, ChevronRight } from "lucide-react";
import { useAdminUsers } from "@loupe/core";
import { Skeleton, NoteCard, Button, TextField, Pagination } from "@/components";
import { cx } from "@/lib/cx";
import { UserDetailDrawer } from "../UserDetailDrawer/UserDetailDrawer";
import styles from "./AdminUsers.module.scss";
import admin from "../admin.module.scss";

const PAGE_SIZE = 20;

function joined(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Admin user directory — search, then open any user for full detail + actions. */
export function AdminUsers() {
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data, isLoading, isError } = useAdminUsers({ q: q || undefined, page, pageSize: PAGE_SIZE });

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(draft.trim());
    setPage(1);
  };

  const users = data?.results ?? [];
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Users</h1>
          <p className={admin.subtitle}>{data ? `${data.total.toLocaleString()} users` : "Search and manage accounts."}</p>
        </div>
        <form className={styles.search} onSubmit={search}>
          <TextField
            label=""
            aria-label="Search users by email or name"
            placeholder="Search email or name…"
            icon={<Search size={16} />}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      {isLoading ? (
        <div className={admin.list}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={56} radius={12} />
          ))}
        </div>
      ) : isError ? (
        <NoteCard title="Couldn't load users" message="Please refresh in a moment." />
      ) : users.length === 0 ? (
        <NoteCard title="No users found" message={q ? `No matches for “${q}”.` : "No users yet."} />
      ) : (
        <div className={styles.table}>
          {users.map((u) => (
            <button key={u.id} type="button" className={styles.row} data-deleted={u.deleted || undefined} onClick={() => setActiveId(u.id)}>
              <div className={styles.row__id}>
                <span className={styles.row__email}>{u.email}</span>
                <span className={styles.row__meta}>
                  {u.displayName ? `${u.displayName} · ` : ""}joined {joined(u.createdAt)}
                </span>
              </div>
              <div className={styles.row__badges}>
                {u.isSuperAdmin ? (
                  <span className={styles.badge} data-tone="mint"><Shield size={12} /> Super-admin</span>
                ) : u.isAdmin ? (
                  <span className={styles.badge} data-tone="mint"><ShieldCheck size={12} /> Admin</span>
                ) : null}
                <span className={styles.badge} data-tone={u.deleted ? "neutral" : u.banned ? "rose" : "neutral"}>
                  {u.deleted ? "Deleted" : u.banned ? "Banned" : "Active"}
                </span>
                <ChevronRight size={16} className={cx(styles.row__chev)} />
              </div>
            </button>
          ))}
        </div>
      )}

      {data && pageCount > 1 && (
        <div className={styles.pager}>
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
        </div>
      )}

      <UserDetailDrawer userId={activeId} open={Boolean(activeId)} onOpenChange={(o) => !o && setActiveId(null)} />
    </div>
  );
}
