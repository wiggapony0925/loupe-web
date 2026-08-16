/**
 * TransactionRow — one edge-to-edge feed row. Tap opens the tag sheet.
 * Charges render plain ("$12.34"), credits with a plus ("+$50.00"); red is
 * never used here — it belongs to errors and negative balances only.
 */
import { money } from '@/lib/format';
import type { Transaction } from '@/types/types';

export interface TransactionRowProps {
  transaction: Transaction;
  onPress: (transaction: Transaction) => void;
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

export function TransactionRow({ transaction, onPress }: TransactionRowProps) {
  const credit = transaction.amountCents < 0;
  const settled = transaction.settlementStatus === 'SETTLED';
  const tag = splitLabel(transaction);

  const amountClass = [
    'transaction-row__amount',
    credit ? 'transaction-row__amount--credit' : '',
    settled ? 'transaction-row__amount--settled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className="transaction-row" onClick={() => onPress(transaction)}>
      <div className="transaction-row__main">
        <div className="transaction-row__top">
          {transaction.status === 'PENDING' ? (
            <span className="transaction-row__live-dot" aria-label="Real-time, awaiting bank posting" />
          ) : null}
          <span className="transaction-row__merchant">{transaction.merchant}</span>
        </div>
        <div className="transaction-row__meta">
          {transaction.account.institutionName}
          {transaction.cardLast4 ? ` ••${transaction.cardLast4}` : ''}
          {transaction.category ? ` · ${transaction.category}` : ''}
          {transaction.applePayDevice ? ` ·  ${transaction.applePayDevice}` : ''}
        </div>
        <div className="transaction-row__badges">
          {transaction.status === 'REQUIRES_TAGGING' ? (
            <span className="badge badge--alert">NEEDS TAG</span>
          ) : null}
          {tag ? <span className="badge badge--outline">{tag}</span> : null}
          {transaction.labels.map((label) => (
            <span key={label.id} className="badge badge--outline">
              {label.name}
            </span>
          ))}
        </div>
      </div>
      <span className={amountClass}>
        {credit ? `+${money(-transaction.amountCents)}` : money(transaction.amountCents)}
      </span>
    </button>
  );
}
