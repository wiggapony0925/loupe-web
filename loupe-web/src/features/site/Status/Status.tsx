import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components";
import { SitePage, SiteSection } from "../SitePage/SitePage";
import { HEALTH_URL } from "@/lib/site";
import styles from "./Status.module.scss";

type Health = "operational" | "degraded" | "down" | "checking";

interface Probe {
  status: Health;
  latencyMs: number | null;
  checkedAt: Date | null;
}

async function probeBackend(): Promise<Pick<Probe, "status" | "latencyMs">> {
  const started = performance.now();
  try {
    const res = await fetch(HEALTH_URL, { cache: "no-store" });
    const latencyMs = Math.round(performance.now() - started);
    if (!res.ok) return { status: "down", latencyMs };
    return { status: latencyMs > 1500 ? "degraded" : "operational", latencyMs };
  } catch {
    return { status: "down", latencyMs: null };
  }
}

const LABELS: Record<Health, string> = {
  operational: "All systems operational",
  degraded: "Degraded performance",
  down: "Service disruption",
  checking: "Checking status…",
};

/** System status — live backend health probe with latency and auto-refresh. */
export function Status() {
  const [probe, setProbe] = useState<Probe>({ status: "checking", latencyMs: null, checkedAt: null });

  const check = useCallback(async () => {
    setProbe((p) => ({ ...p, status: "checking" }));
    const result = await probeBackend();
    setProbe({ ...result, checkedAt: new Date() });
  }, []);

  useEffect(() => {
    void check();
    const id = window.setInterval(check, 30_000);
    return () => window.clearInterval(id);
  }, [check]);

  const components: Array<{ name: string; status: Health; note: string }> = [
    { name: "API", status: probe.status, note: probe.latencyMs != null ? `${probe.latencyMs} ms` : "—" },
    {
      name: "Marketplace pricing",
      status: probe.status === "down" ? "down" : "operational",
      note: probe.status === "down" ? "Unavailable" : "Live",
    },
    {
      name: "Web & mobile apps",
      status: probe.status === "checking" ? "checking" : "operational",
      note: "Online",
    },
  ];

  return (
    <SitePage
      eyebrow="Status"
      title="System status"
      lead="Live health of the Loupe platform. This page probes the backend directly from your browser and refreshes every 30 seconds."
    >
      <div className={styles.banner} data-status={probe.status}>
        <span className={styles.banner__dot} />
        <div className={styles.banner__text}>
          <strong>{LABELS[probe.status]}</strong>
          <span className={styles.banner__meta}>
            {probe.checkedAt ? `Last checked ${probe.checkedAt.toLocaleTimeString()}` : "Checking…"}
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={check}
          disabled={probe.status === "checking"}
          leadingIcon={<RefreshCw size={14} />}
        >
          Refresh
        </Button>
      </div>

      <SiteSection title="Components">
        <ul className={styles.components}>
          {components.map((c) => (
            <li key={c.name} className={styles.component}>
              <span className={styles.component__name}>{c.name}</span>
              <span className={styles.component__right}>
                <span className={styles.component__note}>{c.note}</span>
                <span className={styles.component__badge} data-status={c.status}>
                  {LABELS[c.status]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </SiteSection>
    </SitePage>
  );
}
