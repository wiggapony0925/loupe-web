import { useState } from "react";
import { ScanLine, Zap, Target, DollarSign, Timer } from "lucide-react";
import { useAdminScanner, useAdminScannerTrend } from "@loupe/core";
import { Skeleton, NoteCard, MetricCard, Panel, SegmentedControl } from "@/components";
import { ScanTrends } from "./ScanTrends";
import { ScanHistory } from "./ScanHistory";
import styles from "./AdminScanner.module.scss";
import admin from "../admin.module.scss";

type Window = "7" | "30" | "90";
type Tab = "funnel" | "history";
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

/** A labelled count breakdown rendered as a mini horizontal bar list. */
function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  if (entries.length === 0) return null;
  return (
    <Panel padding="lg" raised className={styles.breakdown}>
      <h2 className={styles.breakdown__title}>{title}</h2>
      {entries.map(([k, n]) => (
        <div key={k} className={styles.bar}>
          <span className={styles.bar__label}>{k}</span>
          <span className={styles.bar__track}>
            <span className={styles.bar__fill} style={{ width: `${(n / max) * 100}%` }} />
          </span>
          <span className={styles.bar__value}>{n.toLocaleString()}</span>
        </div>
      ))}
    </Panel>
  );
}

/** Admin: scan + identify funnel — pHash fast-path rate, accuracy, latency, spend. */
export function AdminScanner() {
  const [tab, setTab] = useState<Tab>("funnel");
  const [win, setWin] = useState<Window>("30");
  const { data: s, isLoading, isError } = useAdminScanner(Number(win), tab === "funnel");
  const { data: trend } = useAdminScannerTrend(Number(win), tab === "funnel");

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Scanner</h1>
          <p className={admin.subtitle}>
            {tab === "funnel"
              ? "Identify funnel — pHash fast-path rate, accuracy, latency, and OCR spend."
              : "Scan history — every scan's photo, result, account, and timing."}
          </p>
        </div>
        {tab === "funnel" && (
          <SegmentedControl<Window>
            aria-label="Time window"
            value={win}
            onChange={setWin}
            options={[
              { value: "7", label: "7d" },
              { value: "30", label: "30d" },
              { value: "90", label: "90d" },
            ]}
          />
        )}
      </div>

      <div className={styles.tabs}>
        <SegmentedControl<Tab>
          aria-label="Scanner view"
          value={tab}
          onChange={setTab}
          options={[
            { value: "funnel", label: "Funnel" },
            { value: "history", label: "History" },
          ]}
        />
      </div>

      {tab === "history" ? (
        <ScanHistory />
      ) : isLoading ? (
        <div className={styles.metrics}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={120} radius={20} />
          ))}
        </div>
      ) : isError || !s ? (
        <NoteCard title="Couldn't load scanner stats" message="Please refresh in a moment." />
      ) : (
        <>
          <div className={styles.metrics}>
            <MetricCard
              accent
              tone="mint"
              icon={<ScanLine size={16} />}
              label="Identifications"
              value={s.totalIdentifications.toLocaleString()}
              caption={`${s.scansTotal.toLocaleString()} scan jobs`}
            />
            <MetricCard
              tone="blue"
              icon={<Zap size={16} />}
              label="pHash fast-path"
              value={pct(s.fastPathRate)}
              caption="Resolved without OCR"
            />
            <MetricCard
              tone="purple"
              icon={<Target size={16} />}
              label="Top-1 accuracy"
              value={s.totalFeedback ? pct(s.top1Accuracy) : "—"}
              caption={`${s.totalFeedback.toLocaleString()} confirmations`}
            />
            <MetricCard
              tone="amber"
              icon={<DollarSign size={16} />}
              label="OCR spend"
              value={`$${s.totalCostUsd.toFixed(2)}`}
              caption={`${s.windowDays}-day window`}
            />
          </div>

          <Panel padding="lg" raised className={styles.latency}>
            <div className={styles.latency__item}>
              <Timer size={15} />
              <span>p50 latency</span>
              <strong>{s.latencyP50Ms.toLocaleString()} ms</strong>
            </div>
            <div className={styles.latency__item}>
              <Timer size={15} />
              <span>p95 latency</span>
              <strong>{s.latencyP95Ms.toLocaleString()} ms</strong>
            </div>
            <div className={styles.latency__item}>
              <Target size={15} />
              <span>Mean confidence</span>
              <strong>{pct(s.meanConfidence)}</strong>
            </div>
          </Panel>

          {trend && trend.points.length > 0 && <ScanTrends points={trend.points} />}

          <div className={styles.grid}>
            <Breakdown title="By winning signal" data={s.bySource} />
            <Breakdown title="By game" data={s.byTcg} />
            <Breakdown title="By OCR provider" data={s.byProvider} />
            <Breakdown title="Scan jobs" data={s.scansByStatus} />
          </div>
        </>
      )}
    </div>
  );
}
