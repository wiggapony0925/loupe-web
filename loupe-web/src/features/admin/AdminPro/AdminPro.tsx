import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import {
  useAdminSiteConfig,
  useUpdatePlanConfig,
  type PlanConfig,
} from "@loupe/core";
import { Button, Skeleton, TextField, useConfirm } from "@/components";
import { notify } from "@/stores/noticeStore";
import styles from "./AdminPro.module.scss";
import admin from "../admin.module.scss";

/** The five gateable Pro capabilities, with portal copy. `key` matches the
 *  backend `gate_*` columns + the client feature flags. */
const FEATURE_GATES: Array<{ key: keyof PlanConfig; label: string; blurb: string }> = [
  { key: "gate_unlimited_cards", label: "Unlimited cards", blurb: "Track past the free card cap." },
  { key: "gate_scanner_import", label: "Scanner auto-import", blurb: "Sync every Scanner capture to the vault." },
  { key: "gate_full_history", label: "Full history & analytics", blurb: "All-time charts and deep analytics." },
  { key: "gate_unlimited_alerts", label: "Unlimited price alerts", blurb: "Watch any number of cards." },
  { key: "gate_statements", label: "Tax & insurance statements", blurb: "One-tap PDF statements." },
];

/** Admin: full control of the Loupe Pro plan shape (limits + per-feature
 *  gating). Announcements live in their own tab. */
export function AdminPro() {
  const { data, isLoading } = useAdminSiteConfig();
  const updatePlan = useUpdatePlanConfig();
  const confirm = useConfirm();

  // Editable limit fields (committed on Save).
  const [cardLimit, setCardLimit] = useState("");
  const [cardUnlimited, setCardUnlimited] = useState(false);
  const [stmtLimit, setStmtLimit] = useState("");
  const [stmtUnlimited, setStmtUnlimited] = useState(false);

  useEffect(() => {
    if (!data) return;
    const p = data.plan;
    setCardUnlimited(p.free_card_limit == null);
    setCardLimit(p.free_card_limit == null ? "" : String(p.free_card_limit));
    setStmtUnlimited(p.free_statement_limit == null);
    setStmtLimit(p.free_statement_limit == null ? "" : String(p.free_statement_limit));
  }, [data]);

  async function toggleGate(key: keyof PlanConfig, label: string, current: boolean) {
    const turningFree = current; // currently gated -> turning OFF the gate = free
    const ok = await confirm({
      title: turningFree ? `Make “${label}” free for everyone?` : `Move “${label}” back into Pro?`,
      tone: turningFree ? "mint" : "default",
      confirmLabel: turningFree ? "Make it free" : "Make it Pro-only",
      message: turningFree ? (
        <>
          Every user — free and Pro — gets <strong>{label}</strong> immediately.
        </>
      ) : (
        <>
          <strong>{label}</strong> becomes a Pro-only feature again, behind the paywall.
        </>
      ),
    });
    if (!ok) return;
    updatePlan.mutate(
      { [key]: !current },
      {
        onSuccess: () => notify.success(`“${label}” is now ${turningFree ? "free for everyone" : "Pro-only"}.`),
        onError: () => notify.error("Couldn't update — please try again."),
      },
    );
  }

  function saveCardLimit() {
    if (cardUnlimited) {
      updatePlan.mutate(
        { clear_card_limit: true },
        { onSuccess: () => notify.success("Free card limit: unlimited."), onError: failToast },
      );
      return;
    }
    const n = parseInt(cardLimit, 10);
    if (Number.isNaN(n) || n < 0) return notify.error("Enter a valid number.");
    updatePlan.mutate(
      { free_card_limit: n },
      { onSuccess: () => notify.success(`Free card limit set to ${n}.`), onError: failToast },
    );
  }

  function saveStmtLimit() {
    if (stmtUnlimited) {
      updatePlan.mutate(
        { clear_statement_limit: true },
        { onSuccess: () => notify.success("Free statement limit: unlimited."), onError: failToast },
      );
      return;
    }
    const n = parseInt(stmtLimit, 10);
    if (Number.isNaN(n) || n < 0) return notify.error("Enter a valid number.");
    updatePlan.mutate(
      { free_statement_limit: n },
      { onSuccess: () => notify.success(`Free statement limit set to ${n}.`), onError: failToast },
    );
  }

  if (isLoading || !data) {
    return (
      <div className={admin.page}>
        <Skeleton height={320} radius={14} />
      </div>
    );
  }

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Loupe Pro</h1>
          <p className={admin.subtitle}>
            Shape the plan — free-tier limits and what&rsquo;s gated behind Pro.
            Live, no deploy.
          </p>
        </div>
      </div>

      {/* ── Free-tier limits ── */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Free-tier limits</h2>
        <div className={styles.limitRow}>
          <div className={styles.limitField}>
            <TextField
              label="Free card limit"
              type="number"
              value={cardLimit}
              disabled={cardUnlimited}
              onChange={(e) => setCardLimit(e.target.value)}
            />
            <label className={styles.check}>
              <input type="checkbox" checked={cardUnlimited} onChange={(e) => setCardUnlimited(e.target.checked)} />
              Unlimited
            </label>
          </div>
          <Button variant="secondary" leadingIcon={<Save size={15} />} disabled={updatePlan.isPending} onClick={saveCardLimit}>
            Save
          </Button>
        </div>
        <div className={styles.limitRow}>
          <div className={styles.limitField}>
            <TextField
              label="Free statement (PDF) limit"
              type="number"
              value={stmtLimit}
              disabled={stmtUnlimited}
              onChange={(e) => setStmtLimit(e.target.value)}
            />
            <label className={styles.check}>
              <input type="checkbox" checked={stmtUnlimited} onChange={(e) => setStmtUnlimited(e.target.checked)} />
              Unlimited
            </label>
          </div>
          <Button variant="secondary" leadingIcon={<Save size={15} />} disabled={updatePlan.isPending} onClick={saveStmtLimit}>
            Save
          </Button>
        </div>
      </section>

      {/* ── Per-feature gating ── */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>What&rsquo;s in Pro</h2>
        <p className={styles.cardHint}>
          Toggle a feature off to make it free for everyone, or on to keep it Pro-only.
        </p>
        {FEATURE_GATES.map((g) => {
          const gated = Boolean(data.plan[g.key]);
          return (
            <div key={g.key} className={styles.gateRow}>
              <div className={styles.gateText}>
                <span className={styles.gateLabel}>
                  {g.label}
                  <span className={styles.gateState} data-pro={gated || undefined}>
                    {gated ? "Pro-only" : "Free for all"}
                  </span>
                </span>
                <span className={styles.gateBlurb}>{g.blurb}</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={gated}
                aria-label={`Toggle ${g.label}`}
                className={styles.switch}
                data-on={gated || undefined}
                disabled={updatePlan.isPending}
                onClick={() => toggleGate(g.key, g.label, gated)}
              >
                <span className={styles.switch__dot} />
              </button>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function failToast() {
  notify.error("Couldn't save — please try again.");
}
