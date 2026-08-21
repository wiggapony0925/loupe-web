/**
 * Feed — the real-time activity stream. A charge lands here seconds after
 * the swipe (email engine), pinned to a "Needs tagging" section when Chase
 * couldn't tell who spent. Tapping any row opens the TagSheet. Push
 * notifications deep-link here with ?txn=<id> and the sheet already open —
 * lock screen → tagged in two taps.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TransactionRow } from '@/components/TransactionRow/TransactionRow';
import { TagSheet } from '@/components/TagSheet/TagSheet';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { useLedgerStore } from '@/store/useLedgerStore';
import { useHaptics } from '@/hooks/useHaptics';
import { friendlyDate } from '@/lib/format';
import type { Transaction } from '@/types/types';

export function Feed() {
  const haptics = useHaptics();
  const feed = useLedgerStore((s) => s.feed);
  const feedCursor = useLedgerStore((s) => s.feedCursor);
  const feedLoading = useLedgerStore((s) => s.feedLoading);
  const loadFeed = useLedgerStore((s) => s.loadFeed);
  const fetchTransaction = useLedgerStore((s) => s.fetchTransaction);

  const [selected, setSelected] = useState<Transaction | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep link from a push notification: /feed?txn=<id>
  const deepLinkId = searchParams.get('txn');
  useEffect(() => {
    if (!deepLinkId) return;
    void fetchTransaction(deepLinkId).then((transaction) => {
      if (transaction) setSelected(transaction);
      setSearchParams({}, { replace: true });
    });
  }, [deepLinkId, fetchTransaction, setSearchParams]);

  const needsTagging = useMemo(() => feed.filter((t) => t.status === 'REQUIRES_TAGGING'), [feed]);
  const rest = useMemo(() => feed.filter((t) => t.status !== 'REQUIRES_TAGGING'), [feed]);

  const groups = useMemo(() => {
    const byDate = new Map<string, Transaction[]>();
    for (const transaction of rest) {
      const bucket = byDate.get(transaction.date) ?? [];
      bucket.push(transaction);
      byDate.set(transaction.date, bucket);
    }
    return [...byDate.entries()];
  }, [rest]);

  const open = (transaction: Transaction): void => {
    haptics.impactLight();
    setSelected(transaction);
  };

  return (
    <div className="page feed">
      <header className="page__header">
        <h1 className="page__title">Activity</h1>
        <button
          type="button"
          className="page__action"
          onClick={() => {
            haptics.impactLight();
            void loadFeed(true);
          }}
        >
          {feedLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {needsTagging.length > 0 ? (
        <section className="section feed__needs-tagging">
          <h2 className="section__title">Needs tagging · {needsTagging.length}</h2>
          <div className="list">
            {needsTagging.map((transaction, index) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                onPress={open}
                enterIndex={Math.min(index, 10)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {feed.length === 0 && !feedLoading ? (
        <EmptyState
          title="No activity yet"
          body="Link an account, or set up alert-email forwarding to see charges the second they happen."
        />
      ) : (
        groups.map(([date, transactions]) => (
          <section key={date} className="section">
            <h2 className="section__title">{friendlyDate(date)}</h2>
            <div className="list">
              {transactions.map((transaction, index) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  onPress={open}
                  enterIndex={Math.min(index, 10)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {feedCursor ? (
        <div className="feed__more">
          <button
            type="button"
            className={`button button--ghost${feedLoading ? ' button--disabled' : ''}`}
            disabled={feedLoading}
            onClick={() => void loadFeed()}
          >
            {feedLoading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : null}

      <TagSheet transaction={selected} open={selected !== null} onClose={() => setSelected(null)} />
    </div>
  );
}
