import { DollarSign, Users, Sparkles, TrendingDown, Gift, Clock } from "lucide-react";
import { useAdminRevenue } from "@loupe/core";
import {
  Skeleton,
  NoteCard,
  Panel,
  MetricCard,
  BarChart,
  DonutChart,
} from "@/components";
import styles from "./AdminRevenue.module.scss";
import admin from "../admin.module.scss";

const usd = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const monthLabel = (m: string) =>
  new Date(`${m}-01T00:00:00`).toLocaleString(undefined, { month: "short" });

/** Admin: Loupe Pro revenue analytics — subscriber mix, est. MRR/ARR, churn,
 *  and new-Pro trend. Derived from subscription state; money figures are
 *  estimates (we model MRR at the monthly price). */
export function AdminRevenue() {
  const { data: r, isLoading, isError } = useAdminRevenue();

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Revenue</h1>
          <p className={admin.subtitle}>
            Loupe Pro subscribers, estimated recurring revenue, and churn.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.metrics}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={120} radius={20} />
          ))}
        </div>
      ) : isError || !r ? (
        <NoteCard title="Couldn't load revenue" message="Please refresh in a moment." />
      ) : (
        <>
          {!r.billingConfigured && (
            <NoteCard
              title="Stripe not configured"
              message="Showing comps and counts only. Set the Stripe keys to capture live paid subscriptions."
            />
          )}

          {/* ── KPI strip ── */}
          <div className={styles.metrics}>
            <MetricCard
              accent
              tone="mint"
              icon={<DollarSign size={16} />}
              label="Est. MRR"
              value={usd(r.estMrrUsd)}
              caption={`≈ ${usd(r.estArrUsd)} ARR`}
            />
            <MetricCard
              tone="blue"
              icon={<Sparkles size={16} />}
              label="Paying"
              value={r.paying.toLocaleString()}
              caption={`${r.trialing.toLocaleString()} on trial`}
            />
            <MetricCard
              tone="purple"
              icon={<Users size={16} />}
              label="New Pro · 30d"
              value={r.newPro30d.toLocaleString()}
              caption="Started this month"
            />
            <MetricCard
              tone="rose"
              icon={<TrendingDown size={16} />}
              label="Churn · 30d"
              value={pct(r.churnRate30d)}
              caption={`${r.churned30d.toLocaleString()} lapsed`}
            />
          </div>

          {/* ── Charts ── */}
          <div className={styles.charts}>
            <Panel padding="lg" raised className={styles.chartCard}>
              <div className={styles.panelHead}>
                <h2 className={styles.panelTitle}>New Pro members</h2>
                <p className={styles.panelSub}>Subscriptions started per month.</p>
              </div>
              <BarChart
                ariaLabel="New Pro members per month"
                height={220}
                format={(n) => Math.round(n).toLocaleString()}
                data={r.proByMonth.map((p) => ({ label: monthLabel(p.month), value: p.newPro }))}
              />
            </Panel>

            <Panel padding="lg" raised className={styles.chartCard}>
              <div className={styles.panelHead}>
                <h2 className={styles.panelTitle}>Subscriber mix</h2>
                <p className={styles.panelSub}>How the base breaks down.</p>
              </div>
              <DonutChart
                ariaLabel="Subscriber mix"
                size={176}
                format={(n) => n.toLocaleString()}
                centerValue={r.totalUsers.toLocaleString()}
                centerLabel="users"
                data={[
                  { label: "Paying", value: r.paying },
                  { label: "Trialing", value: r.trialing },
                  { label: "Comped", value: r.comped },
                  { label: "Free", value: r.free },
                ]}
              />
            </Panel>
          </div>

          {/* ── Secondary ── */}
          <section className={styles.section}>
            <h2 className={styles.section__label}>Pricing & grants</h2>
            <div className={styles.metrics}>
              <MetricCard
                tone="mint"
                icon={<DollarSign size={16} />}
                label="Monthly price"
                value={usd(r.priceMonthlyUsd)}
                caption={`${usd(r.priceYearlyUsd)} / yr`}
              />
              <MetricCard
                tone="amber"
                icon={<Gift size={16} />}
                label="Comped"
                value={r.comped.toLocaleString()}
                caption="Admin grants"
              />
              <MetricCard
                tone="blue"
                icon={<Clock size={16} />}
                label="Trialing"
                value={r.trialing.toLocaleString()}
                caption="In free trial"
              />
              <MetricCard
                tone="purple"
                icon={<Users size={16} />}
                label="Free"
                value={r.free.toLocaleString()}
                caption="Not subscribed"
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
