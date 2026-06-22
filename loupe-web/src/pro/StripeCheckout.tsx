import { useMemo, useState, type FormEvent } from "react";
import { loadStripe, type Appearance, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components";
import styles from "./StripeCheckout.module.scss";

// Cache the Stripe.js load per publishable key (module scope — load once).
let _key = "";
let _promise: Promise<Stripe | null> | null = null;
function getStripe(pk: string) {
  if (!_promise || _key !== pk) {
    _key = pk;
    _promise = loadStripe(pk);
  }
  return _promise;
}

function cssVar(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

/** Map Loupe's live theme tokens onto Stripe's Appearance API, so the embedded
 *  card form matches whatever theme (dark/light) the app is currently in. */
function buildAppearance(): Appearance {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  const line = cssVar("--line", "#2a2a2e");
  const mint = cssVar("--accent-mint", "#00f59b");
  return {
    theme: isLight ? "stripe" : "night",
    variables: {
      colorPrimary: mint,
      colorBackground: cssVar("--bg-elevated", "#1c1c1e"),
      colorText: cssVar("--ink", "#f5f5f7"),
      colorDanger: cssVar("--accent-rose", "#ff453a"),
      fontFamily: cssVar("--font-sans", "Inter, system-ui, sans-serif"),
      borderRadius: "10px",
      spacingUnit: "4px",
    },
    rules: {
      ".Input": {
        backgroundColor: cssVar("--bg-sunken", "#0b0b0d"),
        border: `1px solid ${line}`,
        boxShadow: "none",
      },
      ".Input:focus": {
        border: `1px solid ${mint}`,
        boxShadow: `0 0 0 1px ${mint}`,
      },
      ".Tab": { border: `1px solid ${line}` },
      ".Tab--selected": { borderColor: mint },
      ".Label": { color: cssVar("--ink-muted", "#a1a1a6") },
    },
  };
}

interface StripeCheckoutProps {
  publishableKey: string;
  clientSecret: string;
  mode: "setup" | "payment";
  ctaLabel: string;
  onSuccess: () => void;
}

/** Themed, in-app Stripe checkout. Confirms the subscription's SetupIntent
 *  (trial) or PaymentIntent (charge now) inside our own UI — no redirect for
 *  most cards; 3-D-Secure cards bounce through the return_url. */
export function StripeCheckout({
  publishableKey,
  clientSecret,
  mode,
  ctaLabel,
  onSuccess,
}: StripeCheckoutProps) {
  const stripePromise = useMemo(() => getStripe(publishableKey), [publishableKey]);
  const appearance = useMemo(() => buildAppearance(), []);
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
      <PaymentForm mode={mode} ctaLabel={ctaLabel} onSuccess={onSuccess} />
    </Elements>
  );
}

function PaymentForm({
  mode,
  ctaLabel,
  onSuccess,
}: Pick<StripeCheckoutProps, "mode" | "ctaLabel" | "onSuccess">) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const confirmParams = {
      return_url: `${window.location.origin}/app/settings?upgraded=1`,
    };
    const result =
      mode === "setup"
        ? await stripe.confirmSetup({ elements, confirmParams, redirect: "if_required" })
        : await stripe.confirmPayment({ elements, confirmParams, redirect: "if_required" });
    if (result.error) {
      setError(result.error.message ?? "Payment couldn't be confirmed.");
      setBusy(false);
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <p className={styles.error}>{error}</p>}
      <Button
        type="submit"
        block
        size="lg"
        disabled={!stripe || busy}
        leadingIcon={busy ? <Loader2 size={16} className={styles.spin} /> : <Lock size={15} />}
      >
        {busy ? "Processing…" : ctaLabel}
      </Button>
      <p className={styles.secure}>
        <Lock size={11} /> Secured by Stripe · cancel anytime
      </p>
    </form>
  );
}
