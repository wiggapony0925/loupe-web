import type { ReactNode } from "react";
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
} from "lucide-react";
import { useAdminMetrics } from "@loupe/core";
import { Skeleton, NoteCard, Panel, MetricCard } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import styles from "./AdminOverview.module.scss";

const QUICK_ACTIONS = [
  { to: "/admin/users", icon: Users, label: "Manage users", desc: "Search, roles, bans" },
  { to: "/admin/flags", icon: ToggleRight, label: "Feature flags", desc: "Toggle micro-apps" },
  { to: "/admin/simulator", icon: Smartphone, label: "Simulator", desc: "Preview on device" },
  { to: "/admin/jobs", icon: Briefcase, label: "Post a role", desc: "Open a new job" },
  { to: "/admin/blog", icon: FileText, label: "Write a post", desc: "Publish to the blog" },
  { to: "/admin/waitlist", icon: ScanLine, label: "Scanner waitlist", desc: "See who's in line" },
] as const;

/** Admin overview — the developer-portal dashboard, in the same bento language
 *  as the user Command Center (MetricCards, soft panels, serif greeting). */
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
      <header className={styles.greeting}>
        <p className={styles.greeting__eyebrow}>Developer portal</p>
        <h1 className={styles.greeting__title}>Welcome back, {name}.</h1>
        <p className={styles.greeting__sub}>
          Here's how Loupe is doing across users, hiring, and content.
        </p>
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
          {/* People — the headline, in an Overview panel like the user dash. */}
          <Panel padding="lg" raised className={styles.overview}>
            <div className={styles.overview__head}>
              <h2 className={styles.overview__title}>People</h2>
              <Link to="/admin/users" className={styles.overview__action}>
                Manage users
              </Link>
            </div>
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
                tone="purple"
                icon={<UserPlus size={16} />}
                label="New · 30 days"
                value={fmt(m.usersNew30d)}
                caption="Recent signups"
              />
            </div>
          </Panel>

          <Section label="Hiring, content & hardware">
            <MetricCard
              tone="amber"
              icon={<Briefcase size={16} />}
              label="Open roles"
              value={fmt(m.jobsOpen)}
              caption={`${fmt(m.jobsTotal)} total`}
              onClick={() => navigate("/admin/jobs")}
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
              tone="purple"
              icon={<FileText size={16} />}
              label="Published posts"
              value={fmt(m.postsPublished)}
              caption={`${fmt(m.postsTotal)} total`}
              onClick={() => navigate("/admin/blog")}
            />
            <MetricCard
              tone="mint"
              icon={<ScanLine size={16} />}
              label="Scanner waitlist"
              value={fmt(m.waitlistTotal)}
              caption={`${fmt(m.waitlistWaiting)} waiting`}
              onClick={() => navigate("/admin/waitlist")}
            />
          </Section>
        </>
      )}

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

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.section__label}>{label}</h2>
      <div className={styles.metrics}>{children}</div>
    </section>
  );
}
