import { UserPlus, ScanLine, Plus, ShieldCheck, type LucideIcon } from "lucide-react";
import { useAdminPulse, type PulseType } from "@loupe/core";
import { Skeleton, NoteCard } from "@/components";
import styles from "./AdminPulse.module.scss";
import admin from "../admin.module.scss";

const META: Record<PulseType, { icon: LucideIcon; tone: string; label: string }> = {
  signup: { icon: UserPlus, tone: "mint", label: "Sign-up" },
  scan: { icon: ScanLine, tone: "blue", label: "Scan" },
  acquisition: { icon: Plus, tone: "purple", label: "Added" },
  admin: { icon: ShieldCheck, tone: "amber", label: "Admin" },
};

const usd = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Admin: a live activity stream across the app — signups, scans, collection
 *  additions, and admin actions. Polls every 15s. */
export function AdminPulse() {
  const { data, isLoading, isError, isFetching } = useAdminPulse(40);

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Live pulse</h1>
          <p className={admin.subtitle}>Recent activity across Loupe, newest first.</p>
        </div>
        <span className={styles.live} data-on={isFetching || undefined}>
          <span className={styles.live__dot} />
          Live
        </span>
      </div>

      {isLoading ? (
        <div className={styles.feed}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={56} radius={14} />
          ))}
        </div>
      ) : isError || !data ? (
        <NoteCard title="Couldn't load the feed" message="Please refresh in a moment." />
      ) : data.events.length === 0 ? (
        <NoteCard title="Quiet for now" message="No recent activity to show." />
      ) : (
        <div className={styles.feed}>
          {data.events.map((e) => {
            const m = META[e.type];
            const Icon = m.icon;
            return (
              <div key={e.id} className={styles.event}>
                <span className={styles.event__icon} data-tone={m.tone}>
                  <Icon size={16} />
                </span>
                <div className={styles.event__body}>
                  <span className={styles.event__title}>
                    {e.title}
                    {e.detail && <span className={styles.event__detail}>{e.detail}</span>}
                  </span>
                  <span className={styles.event__actor}>{e.actor ?? "—"}</span>
                </div>
                {e.valueUsd != null && <span className={styles.event__value}>{usd(e.valueUsd)}</span>}
                <time className={styles.event__time}>{ago(e.at)}</time>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
