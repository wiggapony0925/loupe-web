import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useBillingConfig, useSubscribe } from "@loupe/core";
import { Button, Modal, SegmentedControl, Sparkline } from "@/components";
import { notify } from "@/stores/noticeStore";
import { formatMoney } from "@/lib/format";
import type { PaywallReason } from "./ProProvider";
import { StripeCheckout } from "./StripeCheckout";
import {
  PRO_FEATURES,
  PRO_PRICE_MONTHLY,
  PRO_PRICE_YEARLY,
  paywallHeadline,
} from "./proPlan";
import styles from "./UpgradeModal.module.scss";

interface UpgradeModalProps {
  open: boolean;
  reason: PaywallReason;
  onOpenChange: (open: boolean) => void;
}

type Interval = "monthly" | "yearly";
type Step = "plan" | "pay" | "success" | "unavailable";

// A gently rising series for the frosted "Pro analytics" hero — aspirational,
// not real data; it sells the unlock without faking the user's portfolio.
const PREVIEW_SERIES = [12, 14, 13, 17, 16, 21, 20, 26, 25, 31, 30, 38];

/**
 * The Loupe Pro paywall — a three-step flow inside one polished popup:
 *   plan → pay → success
 * Step 1 sells the value; step 2 collects payment with a Stripe Payment Element
 * themed to Loupe (no redirect); step 3 confirms. The webhook grants the plan,
 * so on success we just refresh entitlements.
 */
export function UpgradeModal({ open, reason, onOpenChange }: UpgradeModalProps) {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("plan");
  const [interval, setInterval] = useState<Interval>("yearly");
  const [checkout, setCheckout] = useState<{ secret: string; mode: "setup" | "payment" } | null>(
    null,
  );

  const { data: billing } = useBillingConfig(open);
  const subscribe = useSubscribe({
    onSuccess: (res) => {
      if (res.status !== "ready" || !res.client_secret || !res.mode) {
        setStep("unavailable");
        return;
      }
      setCheckout({ secret: res.client_secret, mode: res.mode });
      setStep("pay");
    },
    onError: () => notify.error("Couldn't start checkout — please try again."),
  });

  // Reset to the value step each time the popup opens.
  useEffect(() => {
    if (open) {
      setStep("plan");
      setCheckout(null);
    }
  }, [open]);

  const monthly = billing?.price_monthly_usd ?? PRO_PRICE_MONTHLY;
  const yearly = billing?.price_yearly_usd ?? PRO_PRICE_YEARLY;
  const trialDays = billing?.trial_days ?? 0;
  const hasPublishableKey = Boolean(billing?.publishable_key);
  const savingsPct = useMemo(
    () => Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100)),
    [monthly, yearly],
  );

  const head = paywallHeadline(reason);
  const priceLabel = interval === "yearly" ? `${formatMoney(yearly)}/yr` : `${formatMoney(monthly)}/mo`;
  const perPeriod = interval === "yearly" ? "year" : "month";
  const ctaLabel =
    trialDays > 0 ? `Start ${trialDays}-day free trial` : "Upgrade to Pro";

  function onContinue() {
    if (billing && (!billing.checkout_available || !hasPublishableKey)) {
      setStep("unavailable");
      return;
    }
    subscribe.mutate(interval);
  }

  function onPaid() {
    void qc.invalidateQueries({ queryKey: ["entitlements"] });
    void qc.invalidateQueries({ queryKey: ["me"] });
    // The webhook needs a beat; refresh again shortly.
    window.setTimeout(() => qc.invalidateQueries({ queryKey: ["entitlements"] }), 2500);
    setStep("success");
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="lg">
      <div className={styles.wrap}>
        {step === "plan" && (
          <PlanStep
            head={head}
            interval={interval}
            setInterval={setInterval}
            yearly={yearly}
            trialDays={trialDays}
            savingsPct={savingsPct}
            priceLabel={priceLabel}
            ctaLabel={ctaLabel}
            pending={subscribe.isPending}
            onContinue={onContinue}
          />
        )}

        {step === "pay" && checkout && billing && (
          <PayStep
            interval={interval}
            priceLabel={priceLabel}
            perPeriod={perPeriod}
            trialDays={trialDays}
            publishableKey={billing.publishable_key}
            secret={checkout.secret}
            mode={checkout.mode}
            onBack={() => setStep("plan")}
            onPaid={onPaid}
          />
        )}

        {step === "success" && (
          <SuccessStep
            trialDays={trialDays}
            onGo={() => {
              onOpenChange(false);
              window.location.assign("/app/vault");
            }}
          />
        )}

        {step === "unavailable" && (
          <UnavailableStep onClose={() => onOpenChange(false)} />
        )}
      </div>
    </Modal>
  );
}

// ── Step 1: the pitch ──────────────────────────────────────────────────────

function PlanStep(props: {
  head: { title: string; sub: string };
  interval: Interval;
  setInterval: (i: Interval) => void;
  yearly: number;
  trialDays: number;
  savingsPct: number;
  priceLabel: string;
  ctaLabel: string;
  pending: boolean;
  onContinue: () => void;
}) {
  const {
    head,
    interval,
    setInterval,
    yearly,
    trialDays,
    savingsPct,
    priceLabel,
    ctaLabel,
    pending,
    onContinue,
  } = props;
  const perMonthHint =
    interval === "yearly"
      ? `${formatMoney(yearly / 12)}/mo, billed yearly`
      : "billed monthly";

  return (
    <>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>
          <Sparkles size={13} /> Loupe Pro
        </span>
        <h2 className={styles.title}>{head.title}</h2>
        <p className={styles.sub}>{head.sub}</p>

        <div className={styles.preview} aria-hidden>
          <div className={styles.previewChart}>
            <Sparkline data={PREVIEW_SERIES} width={520} height={120} strokeWidth={2.5} />
          </div>
          <div className={styles.previewMeta}>
            <span className={styles.previewLabel}>Portfolio · all-time</span>
            <span className={styles.previewDelta}>+18.4%</span>
          </div>
          <div className={styles.previewFrost}>
            <Lock size={14} /> Full history &amp; live analytics
          </div>
        </div>

        <div className={styles.trust}>
          {trialDays > 0 && (
            <span className={styles.trustItem}>
              <BadgeCheck size={14} /> {trialDays}-day free trial
            </span>
          )}
          <span className={styles.trustItem}>
            <ShieldCheck size={14} /> Cancel anytime
          </span>
          <span className={styles.trustItem}>
            <Lock size={14} /> No charge today
          </span>
        </div>
      </header>

      <ul className={styles.features}>
        {PRO_FEATURES.map((f) => (
          <li key={f.title} className={styles.feature}>
            <span className={styles.featureIcon}>
              <f.icon size={16} />
            </span>
            <span className={styles.featureText}>
              <strong>{f.title}</strong>
              <span>{f.blurb}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className={styles.plans}>
        <SegmentedControl<Interval>
          aria-label="Billing interval"
          value={interval}
          onChange={setInterval}
          options={[
            { value: "yearly", label: savingsPct > 0 ? `Yearly · save ${savingsPct}%` : "Yearly" },
            { value: "monthly", label: "Monthly" },
          ]}
        />
        <div className={styles.priceRow}>
          <span className={styles.price}>{priceLabel}</span>
          <span className={styles.priceHint}>
            {trialDays > 0 ? `free for ${trialDays} days, then ${perMonthHint}` : perMonthHint}
          </span>
        </div>
      </div>

      <Button
        variant="primary"
        size="lg"
        block
        disabled={pending}
        leadingIcon={pending ? <Loader2 size={16} className={styles.spin} /> : <Sparkles size={16} />}
        trailingIcon={!pending ? <ArrowRight size={16} /> : undefined}
        onClick={onContinue}
      >
        {pending ? "Starting…" : ctaLabel}
      </Button>
      <p className={styles.fineprint}>
        {trialDays > 0
          ? `${trialDays} days free, then ${priceLabel} · cancel anytime`
          : "Cancel anytime · your collection always stays yours"}
      </p>
    </>
  );
}

// ── Step 2: themed payment ─────────────────────────────────────────────────

function PayStep(props: {
  interval: Interval;
  priceLabel: string;
  perPeriod: string;
  trialDays: number;
  publishableKey: string;
  secret: string;
  mode: "setup" | "payment";
  onBack: () => void;
  onPaid: () => void;
}) {
  const { interval, priceLabel, perPeriod, trialDays, publishableKey, secret, mode, onBack, onPaid } =
    props;
  const ctaLabel = mode === "setup" ? `Start ${trialDays}-day free trial` : "Subscribe";

  return (
    <>
      <button type="button" className={styles.back} onClick={onBack}>
        <ArrowLeft size={15} /> Back
      </button>
      <header className={styles.payHead}>
        <span className={styles.eyebrow}>
          <Sparkles size={13} /> Loupe Pro · {interval}
        </span>
        <h2 className={styles.title}>
          {trialDays > 0 ? "Start your free trial" : "Confirm your subscription"}
        </h2>
      </header>

      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span>Loupe Pro ({interval})</span>
          <span>{priceLabel}</span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryRow} data-strong>
          <span>{trialDays > 0 ? "Due today" : "Billed now"}</span>
          <span className={styles.dueToday}>
            {trialDays > 0 ? `$0.00` : priceLabel}
          </span>
        </div>
        <p className={styles.summaryNote}>
          {trialDays > 0
            ? `Free for ${trialDays} days. Then ${priceLabel} per ${perPeriod} unless you cancel.`
            : `Renews ${priceLabel} per ${perPeriod}. Cancel anytime.`}
        </p>
      </div>

      <StripeCheckout
        publishableKey={publishableKey}
        clientSecret={secret}
        mode={mode}
        ctaLabel={ctaLabel}
        onSuccess={onPaid}
      />
    </>
  );
}

// ── Step 3: success ────────────────────────────────────────────────────────

function SuccessStep({ trialDays, onGo }: { trialDays: number; onGo: () => void }) {
  return (
    <div className={styles.success}>
      <span className={styles.successIcon}>
        <Check size={30} />
      </span>
      <h2 className={styles.successTitle}>Welcome to Loupe Pro</h2>
      <p className={styles.successSub}>
        {trialDays > 0
          ? `Your ${trialDays}-day free trial is active. Unlimited cards, full analytics, and statements are unlocked.`
          : "You're all set — unlimited cards, full analytics, and statements are unlocked."}
      </p>
      <Button size="lg" block trailingIcon={<ArrowRight size={16} />} onClick={onGo}>
        Go to your vault
      </Button>
    </div>
  );
}

function UnavailableStep({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.success}>
      <span className={styles.successIcon} data-muted>
        <XCircle size={28} />
      </span>
      <h2 className={styles.successTitle}>Loupe Pro is launching soon</h2>
      <p className={styles.successSub}>
        Checkout isn&rsquo;t open just yet — you&rsquo;re on the early list and
        we&rsquo;ll let you know the moment it goes live.
      </p>
      <Button variant="secondary" size="lg" block onClick={onClose}>
        Got it
      </Button>
    </div>
  );
}
