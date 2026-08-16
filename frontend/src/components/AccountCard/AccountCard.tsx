/**
 * AccountCard — one linked account row: institution monogram, name, meta,
 * balance. Unknown balances render "—", NEVER $0.00; liabilities render red
 * with an explicit minus so the state never rides on color alone.
 */
import type { CSSProperties } from 'react';
import { moneyOrDash } from '@/lib/format';
import type { Account } from '@/types/types';

const TYPE_LABEL: Record<Account['type'], string> = {
  DEPOSITORY: 'Cash',
  CREDIT: 'Card',
  INVESTMENT: 'Investing',
  LOAN: 'Loan',
  OTHER: 'Other',
};

export interface AccountCardProps {
  account: Account;
  onPress?: (account: Account) => void;
  enterIndex?: number;
}

export function AccountCard({ account, onPress, enterIndex }: AccountCardProps) {
  const isLiability = account.type === 'CREDIT' || account.type === 'LOAN';
  const balance =
    account.type === 'INVESTMENT' && account.currentBalanceCents === null
      ? account.holdingsValueCents
      : account.currentBalanceCents;
  const monogram = account.institutionName.charAt(0).toUpperCase() || '•';

  return (
    <button
      type="button"
      className="account-card"
      style={enterIndex !== undefined ? ({ '--i': enterIndex } as CSSProperties) : undefined}
      onClick={() => onPress?.(account)}
    >
      <span className="account-card__avatar" aria-hidden="true">
        {monogram}
      </span>
      <span className="account-card__main">
        <span className="account-card__name">
          {account.name}
          {account.mask ? ` ••${account.mask}` : ''}
        </span>
        <span className="account-card__meta">
          {account.institutionName} · {TYPE_LABEL[account.type]}
          {account.holdings.length > 0 ? ` · ${account.holdings.length} holdings` : ''}
        </span>
      </span>
      <span
        className={`account-card__balance${isLiability && balance !== null ? ' account-card__balance--liability' : ''}${balance === null ? ' account-card__balance--unknown' : ''}`}
      >
        {isLiability && balance !== null ? `−${moneyOrDash(Math.abs(balance))}` : moneyOrDash(balance)}
      </span>
    </button>
  );
}
