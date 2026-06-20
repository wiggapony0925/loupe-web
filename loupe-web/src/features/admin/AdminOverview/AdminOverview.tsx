import type { ReactNode } from "react";
import { Link } from "react-router-dom";
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
import { Skeleton, NoteCard } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { cx } from "@/lib/cx";
import styles from "./AdminOverview.module.scss";
import admin from "../admin.module.scss";

type Tone = "mint" | "blue" | "rose" | "amber" | "purple" | "neutral";

const QUICK_ACTIONS = [
  { to: "/admin/users", icon: Users, label: "Manage users", desc: "Search, roles, bans" },
  { to: "/admin/flags", icon: ToggleRight, label: "Feature flags", desc: "Toggle micro-apps" },
  { to: "/admin/simulator", icon: Smartphone, label: "Simulator", desc: "Preview on device" },
  { to: "/admin/jobs", icon: Briefcase, label: "Post a role", desc: "Open a new job" },
  { to: "/admin/blog", icon: FileText, label: "Write a post", desc: "Publish to the blog" },
  { to: "/admin/waitlist", icon: ScanLine, label: "Scanner waitlist", desc: "See who's in line" },
] as const;

/** Admin overview — greeting, live metrics, and quick actions. */
export function AdminOverview() {
  const { user } = useAuth();
  const { data: m, isLoading, isError } = useAdminMetrics();
  const name = user?.display_name || user?.email?.split("@")[0] || "there";
  const fmt = (n: number) => n.toLocaleString();

  return (
    <div className={styles.page}>
      <header className={styles.greeting}>
        <p className={styles.greeting__eyebrow}>Developer portal</p>
        <h1 className={styles.greeting__title}>Welcome back, {name}</h1>
        <p className={styles.greeting__sub}>Here's how Loupe is doing across users, hiring, and content.</p>
      </header>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={132} radius={18} />
          ))}
        </div>
      ) : isError || !m ? (
        <NoteCard title="Couldn't load metrics" message="Please refresh in a moment." />
      ) : (
        <>
          <Section label="People">
            <div className={styles.grid}>
              <Link to="/admin/users" className={styles.hero}>
                <span className={styles.hero__icon}>
                  <Users size={24} />
                </span>
                <span className={styles.hero__value}>{fmt(m.usersTotal)}</span>
                <span className={styles.hero__label}>Total users</span>
                <span className={styles.hero__trend}>
                  <UserPlus size={14} /> {fmt(m.usersNew7d)} new this week
                </span>
              </Link>
              <Stat tone="blue" icon={<ShieldCheck size={20} />} value={fmt(m.admins)} label="Admins" to="/admin/users" />
              <Stat tone="rose" icon={<Ban size={20} />} value={fmt(m.banned)} label="Banned" to="/admin/users" />
              <Stat tone="mint" icon={<UserPlus size={20} />} value={fmt(m.usersNew30d)} label="New · 30 days" />
            </div>
          </Section>

          <Section label="Hiring & content">
            <div className={styles.grid3}>
              <Stat tone="amber" icon={<Briefcase size={20} />} value={fmt(m.jobsOpen)} label={`Open roles · ${fmt(m.jobsTotal)} total`} to="/admin/jobs" />
              <Stat tone="blue" icon={<Inbox size={20} />} value={fmt(m.applicationsTotal)} label={`Applications · ${fmt(m.applicationsNew7d)} this week`} to="/admin/applications" />
              <Stat tone="purple" icon={<FileText size={20} />} value={fmt(m.postsPublished)} label={`Published · ${fmt(m.postsTotal)} total`} to="/admin/blog" />
            </div>
          </Section>

          <Section label="Hardware">
            <div className={styles.grid3}>
              <Stat tone="mint" icon={<ScanLine size={20} />} value={fmt(m.waitlistTotal)} label={`Scanner waitlist · ${fmt(m.waitlistWaiting)} waiting`} to="/admin/waitlist" />
            </div>
          </Section>
        </>
      )}

      <Section label="Quick actions">
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
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={admin.title} style={{ fontSize: "var(--text-lg)" }}>
        {label}
      </h2>
      {children}
    </section>
  );
}

function Stat({
  tone,
  icon,
  value,
  label,
  to,
}: {
  tone: Tone;
  icon: ReactNode;
  value: string;
  label: string;
  to?: string;
}) {
  const inner = (
    <>
      <span className={styles.stat__icon} data-tone={tone}>
        {icon}
      </span>
      <span className={styles.stat__value}>{value}</span>
      <span className={styles.stat__label}>{label}</span>
    </>
  );
  return to ? (
    <Link to={to} className={cx(styles.stat, styles.stat__link)}>
      {inner}
    </Link>
  ) : (
    <div className={styles.stat}>{inner}</div>
  );
}
