import { Users, Activity, Sparkles, Zap } from "lucide-react";
import { useAdminEngagement } from "@loupe/core";
import { Skeleton, NoteCard, MetricCard, Panel, BarChart } from "@/components";
import styles from "./AdminEngagement.module.scss";
import admin from "../admin.module.scss";

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const weekLabel = (w: string) =>
  new Date(`${w}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Admin: engagement & retention — active collectors, activation, Pro funnel,
 *  and new-user growth. "Active" = scanned or added a card in the window. */
export function AdminEngagement() {
  const { data: e, isLoading, isError } = useAdminEngagement();

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Engagement</h1>
          <p className={admin.subtitle}>
            Active collectors, activation, and the path to Pro.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.metrics}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={120} radius={20} />
          ))}
        </div>
      ) : isError || !e ? (
        <NoteCard title="Couldn't load engagement" message="Please refresh in a moment." />
      ) : (
        <>
          <div className={styles.metrics}>
            <MetricCard
              accent
              tone="mint"
              icon={<Users size={16} />}
              label="Total users"
              value={e.totalUsers.toLocaleString()}
              caption={`${e.activatedUsers.toLocaleString()} activated`}
            />
            <MetricCard
              tone="blue"
              icon={<Activity size={16} />}
              label="Active · 30d"
              value={e.active30d.toLocaleString()}
              caption={`${e.active7d.toLocaleString()} in 7d`}
            />
            <MetricCard
              tone="purple"
              icon={<Zap size={16} />}
              label="Activation"
              value={pct(e.activationRate)}
              caption="Added ≥ 1 card"
            />
            <MetricCard
              tone="amber"
              icon={<Sparkles size={16} />}
              label="Pro conversion"
              value={pct(e.proRate)}
              caption={`${e.proUsers.toLocaleString()} on Pro`}
            />
          </div>

          <div className={styles.cols}>
            <Panel padding="lg" raised className={styles.card}>
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>New users</h2>
                <p className={styles.cardSub}>Sign-ups per week.</p>
              </div>
              <BarChart
                ariaLabel="New users per week"
                height={220}
                format={(n) => Math.round(n).toLocaleString()}
                data={e.newUsersByWeek.map((w) => ({ label: weekLabel(w.week), value: w.newUsers }))}
              />
            </Panel>

            <Panel padding="lg" raised className={styles.card}>
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>Activation funnel</h2>
                <p className={styles.cardSub}>Sign-up → collection → Pro.</p>
              </div>
              <div className={styles.funnel}>
                {e.funnel.map((step) => {
                  const top = e.funnel[0]?.count || 1;
                  const width = Math.max(4, (step.count / top) * 100);
                  const share = top ? step.count / top : 0;
                  return (
                    <div key={step.label} className={styles.step}>
                      <div className={styles.step__head}>
                        <span>{step.label}</span>
                        <span className={styles.step__count}>
                          {step.count.toLocaleString()} <em>{pct(share)}</em>
                        </span>
                      </div>
                      <div className={styles.step__track}>
                        <span className={styles.step__fill} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>

          <section className={styles.section}>
            <h2 className={styles.section__label}>Active collectors</h2>
            <div className={styles.windows}>
              {([["7 days", e.active7d], ["30 days", e.active30d], ["90 days", e.active90d]] as const).map(
                ([label, n]) => (
                  <div key={label} className={styles.window}>
                    <span className={styles.window__value}>{n.toLocaleString()}</span>
                    <span className={styles.window__label}>{label}</span>
                  </div>
                ),
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
