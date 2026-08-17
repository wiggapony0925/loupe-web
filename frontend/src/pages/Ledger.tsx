/**
 * Ledger — who owes whom. Per circle: each member's net position, the
 * minimal settle-up transfers, pending settlements awaiting the other
 * party's confirmation, and history. Red = you owe (with the amount and
 * direction always spelled out in text).
 */
import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '@/components/Avatar/Avatar';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { useLedgerStore } from '@/store/useLedgerStore';
import { useHaptics } from '@/hooks/useHaptics';
import { money } from '@/lib/format';
import { apiFetch } from '@/lib/api';
import { SettlementRecordSchema } from '@/types/schemas';
import { z } from 'zod';
import type { SettlementRecord } from '@/types/types';

export function Ledger() {
  const haptics = useHaptics();
  const me = useLedgerStore((s) => s.me);
  const circles = useLedgerStore((s) => s.circles);
  const ledgers = useLedgerStore((s) => s.ledgers);
  const loadLedger = useLedgerStore((s) => s.loadLedger);
  const recordSettlement = useLedgerStore((s) => s.recordSettlement);
  const confirmSettlement = useLedgerStore((s) => s.confirmSettlement);

  const [circleId, setCircleId] = useState<string | null>(null);
  const [history, setHistory] = useState<SettlementRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCircleId = circleId ?? circles[0]?.id ?? null;
  const ledger = activeCircleId ? ledgers[activeCircleId] : undefined;

  useEffect(() => {
    if (!activeCircleId) return;
    void loadLedger(activeCircleId).catch(() => undefined);
    void apiFetch(`/v1/circles/${activeCircleId}/settlements`, {
      schema: z.array(SettlementRecordSchema),
    })
      .then(({ data }) => setHistory(data))
      .catch(() => setHistory([]));
  }, [activeCircleId, loadLedger]);

  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const circle of circles) {
      for (const member of circle.members) map.set(member.userId, member.displayName);
    }
    if (me) map.set(me.id, 'You');
    return (userId: string): string => map.get(userId) ?? 'Member';
  }, [circles, me]);

  const settle = async (fromUserId: string, toUserId: string): Promise<void> => {
    if (!activeCircleId) return;
    haptics.impactMedium();
    setBusy(true);
    setError(null);
    try {
      await recordSettlement(activeCircleId, fromUserId, toUserId);
      haptics.success();
    } catch (err) {
      haptics.warning();
      setError(err instanceof Error ? err.message : 'Could not record settlement');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (settlementId: string): Promise<void> => {
    if (!activeCircleId) return;
    haptics.impactMedium();
    setBusy(true);
    try {
      await confirmSettlement(activeCircleId, settlementId);
      haptics.success();
      const { data } = await apiFetch(`/v1/circles/${activeCircleId}/settlements`, {
        schema: z.array(SettlementRecordSchema),
      });
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm');
    } finally {
      setBusy(false);
    }
  };

  if (circles.length === 0) {
    return (
      <div className="page ledger">
        <header className="page__header">
          <h1 className="page__title">Ledger</h1>
        </header>
        <EmptyState
          title="No circles yet"
          body="Create a circle with your partner or family — tagged expenses turn into a running ledger here."
        />
      </div>
    );
  }

  return (
    <div className="page ledger">
      <header className="page__header">
        <h1 className="page__title">Ledger</h1>
      </header>

      {circles.length > 1 ? (
        <div className="chip-row">
          {circles.map((circle) => (
            <button
              key={circle.id}
              type="button"
              className={`chip${circle.id === activeCircleId ? ' chip--active' : ''}`}
              onClick={() => {
                haptics.impactLight();
                setCircleId(circle.id);
              }}
            >
              {circle.name}
            </button>
          ))}
        </div>
      ) : null}

      {ledger ? (
        <>
          <section className="section">
            <h2 className="section__title">Balances</h2>
            <div className="list">
              {ledger.members.map((member) => {
                const isYou = member.userId === me?.id;
                const netText =
                  member.netCents === 0
                    ? 'even'
                    : member.netCents > 0
                      ? `${isYou ? 'are owed' : 'is owed'} ${money(member.netCents)}`
                      : `${isYou ? 'owe' : 'owes'} ${money(-member.netCents)}`;
                return (
                  <div key={member.userId} className="ledger__member">
                    <span className="ledger__member-id">
                      <Avatar name={member.displayName} size="sm" />
                      <span className="ledger__member-name">{nameOf(member.userId)}</span>
                    </span>
                    <span
                      className={`ledger__member-net${member.netCents < 0 ? ' ledger__member-net--owing' : ''}${member.netCents === 0 ? ' ledger__member-net--even' : ''}`}
                    >
                      {netText}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="ledger__caption">
              {ledger.unsettledTransactionCount} unsettled transaction
              {ledger.unsettledTransactionCount === 1 ? '' : 's'}
            </p>
          </section>

          {ledger.suggestions.length > 0 ? (
            <section className="section">
              <h2 className="section__title">Settle up</h2>
              <div className="list">
                {ledger.suggestions.map((suggestion) => (
                  <div
                    key={`${suggestion.fromUserId}-${suggestion.toUserId}`}
                    className="ledger__suggestion"
                  >
                    <span className="ledger__suggestion-text">
                      <strong>{nameOf(suggestion.fromUserId)}</strong> pays{' '}
                      <strong>{nameOf(suggestion.toUserId)}</strong>{' '}
                      <span className="ledger__suggestion-amount">{money(suggestion.cents)}</span>
                    </span>
                    <button
                      type="button"
                      className={`button button--primary button--inline${busy ? ' button--disabled' : ''}`}
                      onClick={() => void settle(suggestion.fromUserId, suggestion.toUserId)}
                    >
                      Record
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {ledger.pendingSettlements.length > 0 ? (
            <section className="section">
              <h2 className="section__title">Pending confirmation</h2>
              <div className="list">
                {ledger.pendingSettlements.map((pending) => (
                  <div key={pending.id} className="ledger__suggestion">
                    <span className="ledger__suggestion-text">
                      {nameOf(pending.fromUserId)} → {nameOf(pending.toUserId)}{' '}
                      <span className="ledger__suggestion-amount">{money(pending.amountCents)}</span>
                    </span>
                    <button
                      type="button"
                      className={`button button--ghost button--inline${busy ? ' button--disabled' : ''}`}
                      onClick={() => void confirm(pending.id)}
                    >
                      Confirm
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {history.length > 0 ? (
            <section className="section">
              <h2 className="section__title">History</h2>
              <div className="list">
                {history.map((record) => (
                  <div key={record.id} className="ledger__history-row">
                    <span className="ledger__history-text">
                      {record.fromUser.displayName} paid {record.toUser.displayName}
                    </span>
                    <span className="ledger__history-meta">
                      {money(record.amountCents)} ·{' '}
                      {record.status === 'CONFIRMED' ? 'confirmed' : 'pending'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <p className="notice">Computing ledger…</p>
      )}

      {error ? <p className="notice notice--error">{error}</p> : null}
    </div>
  );
}
