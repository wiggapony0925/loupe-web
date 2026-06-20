import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAddGrade,
  useDeleteGrade,
  useMarket,
  useUpdateGrade,
  type CardSummary,
  type GradedCard,
  type GradeHouse,
  type RawCondition,
} from "@loupe/core";
import { Button, Modal, SegmentedControl, TextField } from "@/components";
import { formatMoney } from "@/lib/format";
import { CONDITIONS, HOUSES } from "../houses";
import styles from "./CollectionForm.module.scss";

type Mode =
  | { mode: "create"; card: CardSummary; holding?: never }
  | { mode: "edit"; holding: GradedCard; card?: never };

export type CollectionFormProps = Mode & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful add/edit/remove, so callers can flag "done". */
  onSaved?: () => void;
};

interface FormState {
  house: GradeHouse;
  grade: string;
  condition: RawCondition;
  copies: string;
  price: string;
  purchaseDate: string;
  estValue: string;
  notes: string;
}

function initialState(props: CollectionFormProps): FormState {
  if (props.mode === "edit") {
    const h = props.holding;
    return {
      house: (h.house as GradeHouse) ?? "psa",
      grade: h.house === "loupe" ? "" : String(h.grade ?? ""),
      condition: h.condition ?? "nm",
      copies: "1",
      price: h.purchasePriceUsd != null ? String(h.purchasePriceUsd) : "",
      purchaseDate: h.purchaseDate ?? "",
      estValue: h.estimatedValueUsd != null ? String(h.estimatedValueUsd) : "",
      notes: h.notes ?? "",
    };
  }
  return { house: "psa", grade: "10", condition: "nm", copies: "1", price: "", purchaseDate: "", estValue: "", notes: "" };
}

/**
 * The single, reusable add/edit/remove popup for a vault holding. Mirrors the
 * mobile `GradeForm`: grading house · grade or condition · copies · cost basis
 * · purchase date · estimated value · notes. In edit mode it can also remove
 * the holding (two-step confirm). Used by the storefront "Add to collection"
 * button and the Vault's per-card "Manage" action.
 */
export function CollectionForm(props: CollectionFormProps) {
  const { open, onOpenChange, onSaved } = props;
  const isEdit = props.mode === "edit";

  const [s, setS] = useState<FormState>(() => initialState(props));
  const [removing, setRemoving] = useState(false);
  const estTouched = useRef(isEdit);

  const add = useAddGrade();
  const update = useUpdateGrade();
  const remove = useDeleteGrade();
  const pending = add.isPending || update.isPending || remove.isPending;
  const error = add.isError || update.isError || remove.isError;

  // Reset the form each time it opens so a reused instance never shows stale input.
  useEffect(() => {
    if (!open) return;
    setS(initialState(props));
    setRemoving(false);
    estTouched.current = isEdit;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setS((prev) => ({ ...prev, [key]: value }));

  const isRaw = s.house === "loupe";
  const cardName = props.mode === "edit" ? props.holding.cardName : props.card.name;

  // Create-mode: prefill the estimated value from the live market snapshot until
  // the user edits it. Edit-mode keeps the user's persisted value untouched.
  const market = useMarket(props.mode === "create" ? props.card.id : "");
  const suggested = useMemo(() => {
    if (isEdit || !market.data) return null;
    const { raw, gradedAvg, popTop } = market.data;
    if (isRaw) return raw ?? gradedAvg ?? popTop;
    return (Number(s.grade) >= 8 ? popTop ?? gradedAvg : gradedAvg ?? popTop) ?? raw;
  }, [isEdit, market.data, isRaw, s.grade]);

  useEffect(() => {
    if (estTouched.current || !suggested) return;
    set("estValue", suggested.amount.toFixed(2));
  }, [suggested]);

  const gradeNum = Number(s.grade);
  const gradeValid = isRaw || (s.grade !== "" && Number.isFinite(gradeNum) && gradeNum >= 0 && gradeNum <= 10);
  const canSubmit = !pending && gradeValid;

  const displayValue = s.estValue !== "" ? Number(s.estValue) : suggested?.amount ?? null;

  const close = () => onOpenChange(false);

  const submit = async () => {
    if (!canSubmit) return;
    const shared = {
      house: s.house,
      grade: isRaw ? 0 : gradeNum || 0,
      condition: isRaw ? s.condition : null,
      purchasePriceUsd: s.price.trim() ? Number(s.price) : null,
      purchaseDate: s.purchaseDate || null,
      estimatedValueUsd: s.estValue.trim() ? Number(s.estValue) : null,
      notes: s.notes.trim() || null,
    };
    try {
      if (props.mode === "edit") {
        await update.mutateAsync({ id: props.holding.id, ...shared });
      } else {
        const copies = Math.max(1, Math.min(99, parseInt(s.copies, 10) || 1));
        // One row per copy — the backend models copies as distinct holdings.
        for (let i = 0; i < copies; i++) {
          await add.mutateAsync({ upstreamId: props.card.id, ...shared });
        }
      }
      onSaved?.();
      close();
    } catch {
      /* surfaced inline via `error` */
    }
  };

  const confirmRemove = async () => {
    if (!isEdit) return;
    try {
      await remove.mutateAsync(props.holding.id);
      onSaved?.();
      close();
    } catch {
      /* surfaced inline via `error` */
    }
  };

  const title = isEdit ? `Edit ${cardName ?? "holding"}` : `Add ${cardName ?? "card"}`;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={removing ? "Remove from vault?" : title}
      description={
        removing
          ? "This deletes the holding from your vault. The card stays in the catalog."
          : isEdit
            ? "Update the details of this holding. Changes appear across your vault and analytics instantly."
            : "Record a card you own. It appears in your Vault and Analytics instantly."
      }
      footer={
        removing ? (
          <>
            <Button variant="secondary" onClick={() => setRemoving(false)} disabled={pending}>
              Keep it
            </Button>
            <Button variant="danger" onClick={confirmRemove} disabled={pending}>
              {remove.isPending ? "Removing…" : "Remove from vault"}
            </Button>
          </>
        ) : (
          <>
            {isEdit && (
              <Button variant="ghost" className={styles.remove} onClick={() => setRemoving(true)} disabled={pending}>
                Remove
              </Button>
            )}
            <Button variant="secondary" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!canSubmit}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add to collection"}
            </Button>
          </>
        )
      }
    >
      {!removing && (
        <div className={styles.form}>
          <div className={styles.hero}>
            <span className={styles.hero__label}>Estimated value</span>
            <span className={styles.hero__value}>
              {displayValue != null && Number.isFinite(displayValue)
                ? formatMoney({ amount: displayValue, currency: "USD" })
                : "—"}
            </span>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Grading house</span>
            <SegmentedControl aria-label="Grading house" options={HOUSES} value={s.house} onChange={(v) => set("house", v)} />
          </div>

          {isRaw ? (
            <div className={styles.field}>
              <span className={styles.label}>Condition</span>
              <SegmentedControl
                aria-label="Condition"
                options={CONDITIONS}
                value={s.condition}
                onChange={(v) => set("condition", v)}
              />
            </div>
          ) : (
            <TextField
              label="Grade (0–10)"
              type="number"
              inputMode="decimal"
              min={0}
              max={10}
              step={0.5}
              value={s.grade}
              onChange={(e) => set("grade", e.target.value)}
            />
          )}

          <div className={styles.row}>
            {!isEdit && (
              <TextField
                label="Copies"
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                value={s.copies}
                onChange={(e) => set("copies", e.target.value)}
              />
            )}
            <TextField
              label="Paid (USD, optional)"
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="—"
              value={s.price}
              onChange={(e) => set("price", e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <TextField
              label="Purchase date (optional)"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={s.purchaseDate}
              onChange={(e) => set("purchaseDate", e.target.value)}
            />
            <TextField
              label="Estimated value (USD)"
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="—"
              value={s.estValue}
              onChange={(e) => {
                estTouched.current = true;
                set("estValue", e.target.value);
              }}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="collection-notes">
              Notes (optional)
            </label>
            <textarea
              id="collection-notes"
              className={styles.textarea}
              rows={3}
              placeholder="Slab cert #, condition notes, anything."
              value={s.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {error && <p className={styles.error}>Couldn't save right now — please try again.</p>}
        </div>
      )}
    </Modal>
  );
}
