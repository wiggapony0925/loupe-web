import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Briefcase,
  Inbox,
  FileText,
  UserPlus,
  ShieldCheck,
  Ban,
  ToggleRight,
  Smartphone,
  ScanLine,
  ArrowRight,
  Megaphone,
  Sparkles,
} from "lucide-react";
import { useAdminMetrics } from "@loupe/core";
import {
  Skeleton,
  NoteCard,
  Panel,
  MetricCard,
  BarChart,
  DonutChart,
  Button,
} from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import styles from "./AdminOverview.module.scss";

const QUICK_ACTIONS = [
  { to: "/admin/announce", icon: Megaphone, label: "Send announcement", desc: "Banner to every user" },
  { to: "/admin/pro", icon: Sparkles, label: "Tune Loupe Pro", desc: "Limits & feature gates" },
  { to: "/admin/users", icon: Users, label: "Manage users", desc: "Search, roles, bans" },
  { to: "/admin/flags", icon: ToggleRight, label: "Feature flags", desc: "Toggle micro-apps" },
  { to: "/admin/simulator", icon: Smartphone, label: "Simulator", desc: "Preview on device" },
  { to: "/admin/jobs", icon: Briefcase, label: "Post a role", desc: "Open a new job" },
] as const;

/** Admin overview — the developer-portal dashboard: a welcome header with
 *  actions, a KPI strip, two chart panels, secondary metrics, and quick links.
 *  Same bento language as the user Command Center, in the mint/dark theme. */
export function AdminOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: m, isLoading, isError } = useAdminMetrics();
  const name = user?.display_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const fmt = (n: number) => n.toLocaleString();

  // Weekly user growth as a real delta pill on the headline card.
  const weeklyGrowth =
    m && m.usersTotal - m.usersNew7d > 0
      ? (m.usersNew7d / (m.usersTotal - m.usersNew7d)) * 100
      : undefined;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.hero__text}>
          <p className={styles.hero__eyebrow}>Developer portal</p>
          <h1 className={styles.hero__title}>Welcome back, {name}.</h1>
          <p className={styles.hero__sub}>
            Here&rsquo;s how Loupe is doing across users, hiring, and content.
          </p>
        </div>
        <div className={styles.hero__actions}>
          <Button
            variant="secondary"
            leadingIcon={<Users size={16} />}
            onClick={() => navigate("/admin/users")}
          >
            Manage users
          </Button>
          <Button leadingIcon={<Megaphone size={16} />} onClick={() => navigate("/admin/announce")}>
            Send announcement
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className={styles.metrics}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={120} radius={20} />
          ))}
        </div>
      ) : isError || !m ? (
        <NoteCard title="Couldn't load metrics" message="Please refresh in a moment." />
      ) : (
        <>
          {/* ── KPI strip ── */}
          <div className={styles.metrics}>
            <MetricCard
              accent
              tone="mint"
              icon={<Users size={16} />}
              label="Total users"
              value={fmt(m.usersTotal)}
              changePct={weeklyGrowth}
              caption={`${fmt(m.usersNew7d)} new this week`}
              onClick={() => navigate("/admin/users")}
            />
            <MetricCard
              tone="purple"
              icon={<UserPlus size={16} />}
              label="New · 30 days"
              value={fmt(m.usersNew30d)}
              caption="Recent signups"
              onClick={() => navigate("/admin/users")}
            />
            <MetricCard
              tone="blue"
              icon={<Inbox size={16} />}
              label="Applications"
              value={fmt(m.applicationsTotal)}
              caption={`${fmt(m.applicationsNew7d)} this week`}
              onClick={() => navigate("/admin/applications")}
            />
            <MetricCard
              tone="amber"
              icon={<ScanLine size={16} />}
              label="Scanner waitlist"
              value={fmt(m.waitlistTotal)}
              caption={`${fmt(m.waitlistWaiting)} waiting`}
              onClick={() => navigate("/admin/waitlist")}
            />
          </div>

          {/* ── Charts ── */}
          <div className={styles.charts}>
            <Panel padding="lg" raised className={styles.chartCard}>
              <div className={styles.panelHead}>
                <div>
                  <h2 className={styles.panelTitle}>Community at a glance</h2>
                  <p className={styles.panelSub}>Totals across the things people make and join.</p>
                </div>
                <Link to="/admin/users" className={styles.panelLink}>
                  Users <ArrowRight size={14} />
                </Link>
              </div>
              <BarChart
                ariaLabel="Community totals"
                height={220}
                format={(n) => fmt(Math.round(n))}
                data={[
                  { label: "Users", value: m.usersTotal },
                  { label: "Posts", value: m.postsPublished },
                  { label: "Jobs", value: m.jobsOpen },
                  { label: "Apps", value: m.applicationsTotal },
                  { label: "Waitlist", value: m.waitlistTotal },
                ]}
              />
            </Panel>

            <Panel padding="lg" raised className={styles.chartCard}>
              <div className={styles.panelHead}>
                <div>
                  <h2 className={styles.panelTitle}>Pipeline</h2>
                  <p className={styles.panelSub}>Where attention is needed.</p>
                </div>
              </div>
              <DonutChart
                ariaLabel="Pipeline breakdown"
                size={176}
                format={fmt}
                centerValue={fmt(m.applicationsTotal + m.waitlistTotal + m.jobsOpen)}
                centerLabel="open items"
                data={[
                  { label: "Applications", value: m.applicationsTotal },
                  { label: "Waitlist", value: m.waitlistTotal },
                  { label: "Open roles", value: m.jobsOpen },
                ]}
              />
            </Panel>
          </div>

          {/* ── Secondary metrics ── */}
          <section className={styles.section}>
            <h2 className={styles.section__label}>Accounts & content</h2>
            <div className={styles.metrics}>
              <MetricCard
                tone="blue"
                icon={<ShieldCheck size={16} />}
                label="Admins"
                value={fmt(m.admins)}
                caption="Portal access"
                onClick={() => navigate("/admin/users")}
              />
              <MetricCard
                tone="rose"
                icon={<Ban size={16} />}
                label="Banned"
                value={fmt(m.banned)}
                caption="Suspended accounts"
                onClick={() => navigate("/admin/users")}
              />
              <MetricCard
                tone="amber"
                icon={<Briefcase size={16} />}
                label="Open roles"
                value={fmt(m.jobsOpen)}
                caption={`${fmt(m.jobsTotal)} total`}
                onClick={() => navigate("/admin/jobs")}
              />
              <MetricCard
                tone="purple"
                icon={<FileText size={16} />}
                label="Published posts"
                value={fmt(m.postsPublished)}
                caption={`${fmt(m.postsTotal)} total`}
                onClick={() => navigate("/admin/blog")}
              />
            </div>
          </section>
        </>
      )}

      {/* ── Quick actions ── */}
      <section className={styles.section}>
        <h2 className={styles.section__label}>Quick actions</h2>
        <div className={styles.actions}>
          {QUICK_ACTIONS.map(({ to, icon: Icon, label, desc }) => (
            <Link key={to} to={to} className={styles.action}>
              <span className={styles.action__icon}>
                <Icon size={18} />
              </span>
              <span className={styles.action__body}>
                <span className={styles.action__label}>{label}</span>
                <span className={styles.action__desc}>{desc}</span>
              </span>
              <ArrowRight size={16} className={styles.action__arrow} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
