/**
 * AccountCard — one linked account row. Unknown balances render "—",
 * NEVER $0.00; liabilities (credit/loan) render in red per the palette rule
 * with an explicit minus sign, so the state never rides on color alone.
 */
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
}

export function AccountCard({ account, onPress }: AccountCardProps) {
  const isLiability = account.type === 'CREDIT' || account.type === 'LOAN';
  const balance =
    account.type === 'INVESTMENT' && account.currentBalanceCents === null
      ? account.holdingsValueCents
      : account.currentBalanceCents;

  return (
    <button type="button" className="account-card" onClick={() => onPress?.(account)}>
      <div className="account-card__main">
        <span className="account-card__name">
          {account.name}
          {account.mask ? ` ••${account.mask}` : ''}
        </span>
        <span className="account-card__meta">
          {account.institutionName} · {TYPE_LABEL[account.type]}
          {account.holdings.length > 0 ? ` · ${account.holdings.length} holdings` : ''}
        </span>
      </div>
      <span
        className={`account-card__balance${isLiability && balance !== null ? ' account-card__balance--liability' : ''}${balance === null ? ' account-card__balance--unknown' : ''}`}
      >
        {isLiability && balance !== null ? `−${moneyOrDash(Math.abs(balance))}` : moneyOrDash(balance)}
      </span>
    </button>
  );
}
