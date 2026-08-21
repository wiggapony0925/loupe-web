/**
 * Recurring — the subscription manager. Every steady charge across ALL your
 * cards, detected server-side, monthly-normalized, with "due soon" pinned.
 */
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar/Avatar';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { useLedgerStore } from '@/store/useLedgerStore';
import { useHaptics } from '@/hooks/useHaptics';
import { money } from '@/lib/format';
import type { RecurringItem } from '@/types/types';

const CADENCE_LABEL: Record<RecurringItem['cadence'], string> = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
};

function daysUntil(isoDate: string): number {
  return Math.ceil((Date.parse(isoDate) - Date.now()) / 86_400_000);
}

function dueLabel(item: RecurringItem): string {
  const days = daysUntil(item.nextExpectedDate);
  if (days <= 0) return 'due now';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

function RecurringRow({ item }: { item: RecurringItem }) {
  return (
    <div className="recurring__row">
      <Avatar name={item.merchant} />
      <span className="recurring__row-main">
        <span className="recurring__row-name">{item.merchant}</span>
        <span className="recurring__row-meta">
          {CADENCE_LABEL[item.cadence]} · {item.accounts.join(', ')}
        </span>
      </span>
      <span className="recurring__row-side">
        <span className="recurring__row-amount">{money(item.averageAmountCents)}</span>
        <span className="recurring__row-due">{dueLabel(item)}</span>
      </span>
    </div>
  );
}

export function Recurring() {
  const haptics = useHaptics();
  const navigate = useNavigate();
  const recurring = useLedgerStore((s) => s.recurring);
  const loadRecurring = useLedgerStore((s) => s.loadRecurring);

  useEffect(() => {
    void loadRecurring().catch(() => undefined);
  }, [loadRecurring]);

  const dueSoon = useMemo(
    () => (recurring?.items ?? []).filter((item) => daysUntil(item.nextExpectedDate) <= 7),
    [recurring],
  );
  const rest = useMemo(
    () => (recurring?.items ?? []).filter((item) => daysUntil(item.nextExpectedDate) > 7),
    [recurring],
  );

  return (
    <div className="page recurring">
      <header className="page__header">
        <h1 className="page__title">Recurring</h1>
        {/* "Done" is a phone affordance: there, this page is only reachable by
            tapping the Home card, so back always has somewhere to go. On
            desktop it's a first-class sidebar destination that can be opened
            cold by URL, where history-back would leave the app entirely. */}
        <button
          type="button"
          className="page__action page__action--mobile-only"
          onClick={() => {
            haptics.impactLight();
            navigate(-1);
          }}
        >
          Done
        </button>
      </header>

      {recurring && recurring.items.length > 0 ? (
        <div className="recurring__hero">
          <span className="recurring__hero-label">MONTHLY RECURRING</span>
          <span className="recurring__hero-value">{money(recurring.monthlyTotalCents)}</span>
          <span className="recurring__hero-meta">
            {recurring.items.length} subscription{recurring.items.length === 1 ? '' : 's'} detected
            across your cards
          </span>
        </div>
      ) : null}

      {!recurring || recurring.items.length === 0 ? (
        <EmptyState
          title="No recurring charges yet"
          body="Once trackify sees the same merchant on a steady rhythm — Netflix monthly, iCloud yearly — it shows up here automatically."
        />
      ) : (
        <>
          {dueSoon.length > 0 ? (
            <section className="section">
              <h2 className="section__title">Due soon</h2>
              <div className="list">
                {dueSoon.map((item) => (
                  <RecurringRow key={item.merchantNormalized} item={item} />
                ))}
              </div>
            </section>
          ) : null}
          {rest.length > 0 ? (
            <section className="section">
              <h2 className="section__title">All subscriptions</h2>
              <div className="list">
                {rest.map((item) => (
                  <RecurringRow key={item.merchantNormalized} item={item} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
