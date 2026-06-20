import { useEffect, useState } from "react";
import { Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useJoinWaitlist, type WaitlistJoined } from "@loupe/core";
import { Modal, Button, TextField } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { SCANNER_PRICE, scannerPriceLabel } from "../scannerProduct";
import styles from "./WaitlistCheckout.module.scss";

export interface WaitlistCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quantity?: number;
}

/**
 * The scanner "checkout" — styled like an Amazon order review, but pressing
 * the CTA reserves a waitlist spot instead of charging a card. (Stripe will
 * slot in here later; for now $0 is due and we capture the signup.)
 */
export function WaitlistCheckout({ open, onOpenChange, quantity = 1 }: WaitlistCheckoutProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [interest, setInterest] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [done, setDone] = useState<WaitlistJoined | null>(null);

  const join = useJoinWaitlist({
    onSuccess: (res) => setDone(res),
  });

  // Pre-fill from the signed-in account, and reset on each open.
  useEffect(() => {
    if (!open) return;
    setEmail(user?.email ?? "");
    setName(user?.display_name ?? "");
    setInterest("");
    setEmailError(undefined);
    setDone(null);
    join.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const subtotal = SCANNER_PRICE * quantity;

  function submit() {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("Enter a valid email so we can send your invite.");
      return;
    }
    setEmailError(undefined);
    join.mutate({
      email: value,
      name: name.trim() || undefined,
      interest: interest.trim() || undefined,
      referralSource: "web_scanner",
      quantity,
    });
  }

  if (done) {
    return (
      <Modal open={open} onOpenChange={onOpenChange} size="sm" title="You're on the list">
        <div className={styles.success}>
          <span className={styles.success__badge}>
            <Check size={28} />
          </span>
          <p className={styles.success__line}>
            You're <strong>#{done.position.toLocaleString()}</strong> in line for the Loupe Scanner.
          </p>
          <p className={styles.success__sub}>
            We sent a confirmation to <strong>{done.email}</strong>. When your spot opens we'll email a
            private checkout link — no charge until then.
          </p>
          <Button block size="lg" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="Reserve your Loupe Scanner"
      description="Join the waitlist now — you'll only pay when your invite arrives."
    >
      <div className={styles.checkout}>
        <div className={styles.summary}>
          <div className={styles.summary__row}>
            <span className={styles.summary__name}>
              Loupe Scanner
              <span className={styles.summary__qty}>Qty {quantity}</span>
            </span>
            <span className={styles.summary__price}>{scannerPriceLabel(subtotal)}</span>
          </div>
          <div className={styles.summary__divider} />
          <div className={styles.summary__row}>
            <span className={styles.summary__muted}>Due today</span>
            <span className={styles.summary__due}>$0.00</span>
          </div>
          <p className={styles.summary__note}>
            <ShieldCheck size={14} /> No card required to reserve. Cancel anytime.
          </p>
        </div>

        <div className={styles.form}>
          <TextField
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            error={emailError}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus={!user}
          />
          <TextField
            label="Name (optional)"
            placeholder="Ash Ketchum"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className={styles.field}>
            <span className={styles.field__label}>What do you collect? (optional)</span>
            <textarea
              className={styles.field__textarea}
              rows={3}
              placeholder="Modern Pokémon chases, vintage slabs, sealed product…"
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
            />
          </label>

          {join.isError && (
            <p className={styles.error}>Something went wrong. Please try again in a moment.</p>
          )}

          <Button
            block
            size="lg"
            onClick={submit}
            disabled={join.isPending}
            leadingIcon={
              join.isPending ? <Loader2 size={18} className={styles.spin} /> : <Sparkles size={18} />
            }
          >
            {join.isPending ? "Reserving…" : "Join the waitlist"}
          </Button>
          <p className={styles.fine}>
            By joining you agree to receive launch updates. We never sell your data.
          </p>
        </div>
      </div>
    </Modal>
  );
}
