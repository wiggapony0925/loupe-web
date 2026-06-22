import { useMemo, useState } from "react";
import { ArrowRight, Check, Loader2, Lock, Sparkles } from "lucide-react";
import { useBillingConfig, useStartCheckout } from "@loupe/core";
import { Button, Modal, SegmentedControl, Sparkline } from "@/components";
import { formatMoney } from "@/lib/format";
import type { PaywallReason } from "./ProProvider";
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

// A gently rising series for the frosted "Pro analytics" hero. Aspirational,
// not real data — it sells the unlock without faking the user's portfolio.
const PREVIEW_SERIES = [12, 14, 13, 17, 16, 21, 20, 26, 25, 31, 30, 38];

/**
 * The Loupe Pro paywall. Built as a *preview of value*, not a wall: a frosted
 * portfolio chart sits behind the offer, gates read as aspirational unlocks,
 * and the whole thing leans on the mint "Pro" accent (Robinhood-Gold framing).
 * Until Stripe is wired the CTA resolves to a graceful "launching soon" note.
 */
export function UpgradeModal({ open, reason, onOpenChange }: UpgradeModalProps) {
  const [interval, setInterval] = useState<Interval>("yearly");
  const [notice, setNotice] = useState<string | null>(null);
  const { data: billing } = useBillingConfig(open);
  const checkout = useStartCheckout({
    onSuccess: (res) => {
      if (res.status === "checkout" && res.url) {
        window.location.href = res.url;
        return;
      }
      setNotice(
        res.message ??
          "Loupe Pro checkout isn't open yet — you're on the early list.",
      );
    },
    onError: () =>
      setNotice("Couldn't start checkout right now — please try again."),
  });

  const monthly = billing?.price_monthly_usd ?? PRO_PRICE_MONTHLY;
  const yearly = billing?.price_yearly_usd ?? PRO_PRICE_YEARLY;
  const savingsPct = useMemo(
    () => Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100)),
    [monthly, yearly],
  );

  const head = paywallHeadline(reason);
  const priceLabel =
    interval === "yearly"
      ? `${formatMoney(yearly)}/yr`
      : `${formatMoney(monthly)}/mo`;
  const perMonthHint =
    interval === "yearly"
      ? `${formatMoney(yearly / 12)}/mo, billed yearly`
      : "billed monthly";

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="lg">
      <div className={styles.wrap}>
        {/* ── Hero: eyebrow + frosted Pro analytics preview ── */}
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
        </header>

        {/* ── Feature ladder ── */}
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

        {/* ── Plan picker ── */}
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
            <span className={styles.priceHint}>{perMonthHint}</span>
          </div>
        </div>

        {notice && (
          <div className={styles.notice} role="status">
            <Check size={15} /> {notice}
          </div>
        )}

        {/* ── CTA ── */}
        <Button
          variant="primary"
          size="lg"
          block
          disabled={checkout.isPending}
          leadingIcon={
            checkout.isPending ? (
              <Loader2 size={16} className={styles.spin} />
            ) : (
              <Sparkles size={16} />
            )
          }
          trailingIcon={!checkout.isPending ? <ArrowRight size={16} /> : undefined}
          onClick={() => {
            setNotice(null);
            checkout.mutate(interval);
          }}
        >
          {checkout.isPending ? "Starting…" : "Upgrade to Pro"}
        </Button>
        <p className={styles.fineprint}>
          Cancel anytime · your collection always stays yours
        </p>
      </div>
    </Modal>
  );
}
