import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellRing, Check } from "lucide-react";
import {
  useCreateAlert,
  type CardSummary,
  type Money,
  type PriceAlertCondition,
} from "@loupe/core";
import { Button, Modal, TextField, SegmentedControl } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { formatMoney } from "@/lib/format";
import styles from "./PriceAlertButton.module.scss";

const CONDITIONS: { value: PriceAlertCondition; label: string }[] = [
  { value: "below", label: "Drops to" },
  { value: "above", label: "Rises to" },
];

/**
 * "Set price alert" — sign-in-gated. Guests get a sign-in prompt; members open
 * a sheet to pick a direction + threshold and the backend materializes the
 * card from its composite id (so it works on any storefront card). Mirrors the
 * WatchlistButton so the two read as a pair in the buy box.
 */
export function PriceAlertButton({
  card,
  currentPrice,
  block = true,
}: {
  card: CardSummary;
  currentPrice?: Money | null;
  block?: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [signinOpen, setSigninOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [condition, setCondition] = useState<PriceAlertCondition>("below");
  const [amount, setAmount] = useState(() =>
    currentPrice?.amount ? String(round(currentPrice.amount)) : "",
  );
  const [note, setNote] = useState("");

  const create = useCreateAlert({
    onSuccess: () => {
      setDone(true);
      setOpen(false);
    },
  });

  const threshold = Number(amount);
  const valid = Number.isFinite(threshold) && threshold > 0;

  const onTrigger = () => {
    if (!user) {
      setSigninOpen(true);
      return;
    }
    setDone(false);
    setOpen(true);
  };

  const onSubmit = () => {
    if (!valid || create.isPending) return;
    create.mutate({
      upstreamId: card.id,
      condition,
      thresholdUsd: threshold,
      note: note.trim() || undefined,
    });
  };

  return (
    <>
      <Button
        variant="secondary"
        block={block}
        onClick={onTrigger}
        leadingIcon={done ? <Check size={16} /> : <Bell size={16} />}
      >
        {done ? "Alert set" : "Set price alert"}
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Set a price alert"
        description={`We'll email you when ${card.name} hits your target.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={!valid || create.isPending}
              leadingIcon={<BellRing size={16} />}
            >
              {create.isPending ? "Setting…" : "Set alert"}
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          <div className={styles.row}>
            <span className={styles.label}>Notify me when the price</span>
            <SegmentedControl
              aria-label="Alert direction"
              options={CONDITIONS}
              value={condition}
              onChange={setCondition}
              size="sm"
            />
          </div>

          <TextField
            label="Target price (USD)"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            error={amount !== "" && !valid ? "Enter an amount above $0." : undefined}
          />

          {currentPrice?.amount ? (
            <p className={styles.hint}>
              Current market price {formatMoney(currentPrice)}.
            </p>
          ) : null}

          <TextField
            label="Note (optional)"
            value={note}
            maxLength={280}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. buy a second copy"
          />

          {create.isError && (
            <p className={styles.formError}>
              Couldn't set that alert — please try again.
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={signinOpen}
        onOpenChange={setSigninOpen}
        title="Get price alerts"
        description="Sign in to get notified when this card hits your target price."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSigninOpen(false)}>
              Maybe later
            </Button>
            <Button onClick={() => navigate("/login")}>Sign in</Button>
          </>
        }
      />
    </>
  );
}

/** Round a market price to a sensible default target (whole dollars under $100). */
function round(amount: number): number {
  if (amount >= 100) return Math.round(amount);
  return Math.round(amount * 100) / 100;
}
