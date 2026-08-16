/**
 * TransactionRow — one feed row inside a card group: merchant monogram
 * avatar, title + meta, badges, amount. Credits render green with a plus
 * (finance semantics — the sign is always in the text, never color alone).
 * Tap opens the tag sheet.
 */
import type { CSSProperties } from 'react';
import { money } from '@/lib/format';
import type { Transaction } from '@/types/types';

export interface TransactionRowProps {
  transaction: Transaction;
  onPress: (transaction: Transaction) => void;
  /** Entrance-stagger slot (capped upstream); drives animation-delay. */
  enterIndex?: number;
}

function splitLabel(transaction: Transaction): string | null {
  switch (transaction.splitType) {
    case 'MINE':
      return 'Mine';
    case 'PARTNER':
      return transaction.taggedOwner ? `${transaction.taggedOwner.displayName}’s` : 'Partner';
    case 'SPLIT':
      return 'Shared 50/50';
    case 'REIMBURSE':
      return transaction.taggedOwner ? `${transaction.taggedOwner.displayName} owes` : 'Owed';
    default:
      return null;
  }
}

export function TransactionRow({ transaction, onPress, enterIndex }: TransactionRowProps) {
  const credit = transaction.amountCents < 0;
  const settled = transaction.settlementStatus === 'SETTLED';
  const tag = splitLabel(transaction);
  const monogram = transaction.merchant.replace(/[^a-z0-9]/gi, '').charAt(0).toUpperCase() || '•';

  const amountClass = [
    'transaction-row__amount',
    credit ? 'transaction-row__amount--credit' : '',
    settled ? 'transaction-row__amount--settled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className="transaction-row"
      style={enterIndex !== undefined ? ({ '--i': enterIndex } as CSSProperties) : undefined}
      onClick={() => onPress(transaction)}
    >
      <span className="transaction-row__avatar" aria-hidden="true">
        {monogram}
        {transaction.status === 'PENDING' ? (
          <span className="transaction-row__live-dot" aria-label="Real-time, awaiting bank posting" />
        ) : null}
      </span>
      <span className="transaction-row__main">
        <span className="transaction-row__merchant">{transaction.merchant}</span>
        <span className="transaction-row__meta">
          {transaction.account.institutionName}
          {transaction.cardLast4 ? ` ••${transaction.cardLast4}` : ''}
          {transaction.category ? ` · ${transaction.category}` : ''}
          {transaction.applePayDevice ? ` ·  ${transaction.applePayDevice}` : ''}
        </span>
        <span className="transaction-row__badges">
          {transaction.status === 'REQUIRES_TAGGING' ? (
            <span className="badge badge--alert">NEEDS TAG</span>
          ) : null}
          {tag ? <span className="badge badge--outline">{tag}</span> : null}
          {transaction.labels.map((label) => (
            <span key={label.id} className="badge badge--outline">
              {label.name}
            </span>
          ))}
        </span>
      </span>
      <span className={amountClass}>
        {credit ? `+${money(-transaction.amountCents)}` : money(transaction.amountCents)}
      </span>
    </button>
  );
}
