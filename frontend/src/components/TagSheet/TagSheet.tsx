/**
 * TagSheet — the tagging workflow inside a BottomSheet. A charge drops into
 * the feed, the user taps it, and answers one question: whose is this?
 * [Mine] · [<Partner>’s] · [Shared 50/50] · [Owed to me] — plus labels.
 * Every selection fires a light haptic; Save fires a success haptic.
 */
import { useEffect, useMemo, useState } from 'react';
import { BottomSheet } from '@/components/BottomSheet/BottomSheet';
import { useHaptics } from '@/hooks/useHaptics';
import { useLedgerStore } from '@/store/useLedgerStore';
import { money } from '@/lib/format';
import type { Circle, SplitType, Transaction } from '@/types/types';

export interface TagSheetProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
}

interface SplitOption {
  value: SplitType;
  label: string;
  hint: string;
}

function otherMembers(circle: Circle | undefined, excludeUserId: string): Circle['members'] {
  return circle ? circle.members.filter((m) => m.userId !== excludeUserId) : [];
}

export function TagSheet({ transaction, open, onClose }: TagSheetProps) {
  const haptics = useHaptics();
  const circles = useLedgerStore((s) => s.circles);
  const labels = useLedgerStore((s) => s.labels);
  const tagTransaction = useLedgerStore((s) => s.tagTransaction);
  const setTransactionLabels = useLedgerStore((s) => s.setTransactionLabels);

  const [split, setSplit] = useState<SplitType | null>(null);
  const [circleId, setCircleId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed local state each time a (different) transaction opens.
  useEffect(() => {
    if (!open || !transaction) return;
    setSplit(transaction.splitType);
    setCircleId(transaction.circle?.id ?? circles[0]?.id ?? null);
    setOwnerId(transaction.taggedOwner?.id ?? null);
    setLabelIds(transaction.labels.map((l) => l.id));
    setError(null);
  }, [open, transaction, circles]);

  const cardholderId = transaction?.account.userId ?? '';
  const activeCircle = useMemo(
    () => circles.find((c) => c.id === circleId),
    [circles, circleId],
  );
  const partners = otherMembers(activeCircle, cardholderId);
  const soloPartner = partners.length === 1 ? partners[0] : undefined;

  const options: SplitOption[] = [
    { value: 'MINE', label: 'Mine', hint: 'No split' },
    {
      value: 'PARTNER',
      label: soloPartner ? `${soloPartner.displayName}’s` : 'Partner’s',
      hint: 'They owe 100%',
    },
    { value: 'SPLIT', label: 'Shared 50/50', hint: 'Split evenly' },
    { value: 'REIMBURSE', label: 'Owed to me', hint: 'Reimbursement' },
  ];

  const needsCircle = split !== null && split !== 'MINE';
  const needsOwner = split === 'PARTNER' || split === 'REIMBURSE';

  const pickSplit = (value: SplitType): void => {
    haptics.impactLight();
    setSplit((current) => (current === value ? null : value));
    if (value === 'PARTNER' && soloPartner) setOwnerId(soloPartner.userId);
  };

  const toggleLabel = (labelId: string): void => {
    haptics.impactLight();
    setLabelIds((current) =>
      current.includes(labelId) ? current.filter((id) => id !== labelId) : [...current, labelId],
    );
  };

  const save = async (): Promise<void> => {
    if (!transaction) return;
    setSaving(true);
    setError(null);
    try {
      await tagTransaction(transaction.id, {
        splitType: split,
        circleId: split === null ? undefined : needsCircle ? circleId : undefined,
        taggedOwnerId: needsOwner ? ownerId : undefined,
      });
      await setTransactionLabels(transaction.id, labelIds).catch(() => undefined);
      haptics.success();
      onClose();
    } catch (err) {
      haptics.warning();
      setError(err instanceof Error ? err.message : 'Could not save tag');
    } finally {
      setSaving(false);
    }
  };

  if (!transaction) return null;

  const credit = transaction.amountCents < 0;
  const saveDisabled =
    saving || (needsCircle && !circleId) || (needsOwner && !ownerId);

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="tag-sheet">
        <header className="tag-sheet__header">
          <span className="tag-sheet__merchant">{transaction.merchant}</span>
          <span className={`tag-sheet__amount${credit ? ' tag-sheet__amount--credit' : ''}`}>
            {credit ? `+${money(-transaction.amountCents)}` : money(transaction.amountCents)}
          </span>
          <span className="tag-sheet__meta">
            {transaction.account.institutionName}
            {transaction.cardLast4 ? ` ••${transaction.cardLast4}` : ''} · {transaction.date}
          </span>
          {transaction.status === 'REQUIRES_TAGGING' ? (
            <span className="tag-sheet__hint">
              {transaction.applePayDevice
                ? `Apple Pay device: ${transaction.applePayDevice} — confirm who this was.`
                : 'Chase shares card numbers across the family — tell us who swiped.'}
            </span>
          ) : null}
        </header>

        <div className="tag-sheet__options">
          {options.map((option) => {
            const disabled = option.value !== 'MINE' && circles.length === 0;
            const classes = [
              'tag-sheet__option',
              split === option.value ? 'tag-sheet__option--active' : '',
              disabled ? 'tag-sheet__option--disabled' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={option.value}
                type="button"
                className={classes}
                disabled={disabled}
                onClick={() => pickSplit(option.value)}
              >
                <span className="tag-sheet__option-label">{option.label}</span>
                <span className="tag-sheet__option-hint">{option.hint}</span>
              </button>
            );
          })}
        </div>
        {circles.length === 0 ? (
          <p className="notice">Create a circle to share expenses.</p>
        ) : null}

        {needsCircle && circles.length > 1 ? (
          <div className="tag-sheet__section">
            <span className="tag-sheet__section-title">CIRCLE</span>
            <div className="chip-row">
              {circles.map((circle) => (
                <button
                  key={circle.id}
                  type="button"
                  className={`chip${circle.id === circleId ? ' chip--active' : ''}`}
                  onClick={() => {
                    haptics.impactLight();
                    setCircleId(circle.id);
                    setOwnerId(null);
                  }}
                >
                  {circle.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {needsOwner && partners.length > 1 ? (
          <div className="tag-sheet__section">
            <span className="tag-sheet__section-title">WHO?</span>
            <div className="chip-row">
              {partners.map((member) => (
                <button
                  key={member.userId}
                  type="button"
                  className={`chip${member.userId === ownerId ? ' chip--active' : ''}`}
                  onClick={() => {
                    haptics.impactLight();
                    setOwnerId(member.userId);
                  }}
                >
                  {member.displayName}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {labels.length > 0 ? (
          <div className="tag-sheet__section">
            <span className="tag-sheet__section-title">LABELS</span>
            <div className="chip-row">
              {labels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  className={`chip${labelIds.includes(label.id) ? ' chip--active' : ''}`}
                  onClick={() => toggleLabel(label.id)}
                >
                  {label.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {error ? <p className="notice notice--error">{error}</p> : null}

        <div className="tag-sheet__footer">
          <button
            type="button"
            className={`button button--primary${saveDisabled ? ' button--disabled' : ''}`}
            onClick={() => void save()}
          >
            {saving ? 'Saving…' : 'Save tag'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
