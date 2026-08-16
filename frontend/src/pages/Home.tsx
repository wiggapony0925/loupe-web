/**
 * Home — the loupe-style command center: net worth hero (live-updating while
 * scrubbing the chart), assets/liabilities stats, linked accounts, and the
 * Plaid Link entry point (banks, cards, Robinhood via Plaid Investments).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { NetWorthChart } from '@/components/NetWorthChart/NetWorthChart';
import { AccountCard } from '@/components/AccountCard/AccountCard';
import { BottomSheet } from '@/components/BottomSheet/BottomSheet';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { useLedgerStore } from '@/store/useLedgerStore';
import { useHaptics } from '@/hooks/useHaptics';
import { money, moneyHero, moneyOrDash, signedMoney } from '@/lib/format';
import type { Account, NetWorthRange } from '@/types/types';

function PlaidLauncher({
  token,
  onSuccess,
  onDone,
}: {
  token: string;
  onSuccess: (publicToken: string) => void;
  onDone: () => void;
}) {
  const { open, ready } = usePlaidLink({
    token,
    onSuccess: (publicToken) => {
      onSuccess(publicToken);
      onDone();
    },
    onExit: onDone,
  });
  useEffect(() => {
    if (ready) open();
  }, [ready, open]);
  return null;
}

export function Home() {
  const haptics = useHaptics();
  const netWorth = useLedgerStore((s) => s.netWorth);
  const history = useLedgerStore((s) => s.netWorthHistory);
  const range = useLedgerStore((s) => s.netWorthRange);
  const accounts = useLedgerStore((s) => s.accounts);
  const loadNetWorth = useLedgerStore((s) => s.loadNetWorth);
  const createLinkToken = useLedgerStore((s) => s.createLinkToken);
  const exchangePublicToken = useLedgerStore((s) => s.exchangePublicToken);
  const syncAccount = useLedgerStore((s) => s.syncAccount);

  const [scrub, setScrub] = useState<{ t: number; v: number } | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [syncing, setSyncing] = useState(false);

  const points = history?.points ?? [];
  const heroCents = scrub ? scrub.v : netWorth?.netWorthCents ?? null;

  const delta = useMemo(() => {
    if (points.length < 2 || heroCents === null) return null;
    const start = points[0]!.netWorthCents;
    const diff = heroCents - start;
    const pct = start !== 0 ? (diff / Math.abs(start)) * 100 : null;
    return { diff, pct };
  }, [points, heroCents]);

  const startLink = useCallback(async () => {
    haptics.impactLight();
    setLinkError(null);
    try {
      setLinkToken(await createLinkToken());
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Could not start Plaid Link');
    }
  }, [createLinkToken, haptics]);

  const onRangeChange = (next: NetWorthRange): void => {
    void loadNetWorth(next);
  };

  const doSync = async (account: Account): Promise<void> => {
    setSyncing(true);
    try {
      await syncAccount(account.id);
      haptics.success();
      setSelectedAccount(null);
    } finally {
      setSyncing(false);
    }
  };

  const visibleAccounts = accounts.filter((a) => !a.isHidden);

  return (
    <div className="page home">
      <header className="home__hero">
        <span className="home__eyebrow">NET WORTH</span>
        <span className="home__value">{heroCents === null ? '—' : moneyHero(heroCents)}</span>
        {delta ? (
          <span className={`home__delta${delta.diff < 0 ? ' home__delta--down' : ''}`}>
            {signedMoney(delta.diff)}
            {delta.pct !== null ? ` (${delta.pct >= 0 ? '+' : ''}${delta.pct.toFixed(1)}%)` : ''} · {range}
          </span>
        ) : (
          <span className="home__delta home__delta--quiet">
            {scrub ? new Date(scrub.t).toLocaleDateString() : 'as of today'}
          </span>
        )}
      </header>

      <NetWorthChart points={points} range={range} onRangeChange={onRangeChange} onScrub={setScrub} />

      {netWorth ? (
        <div className="home__stats">
          <div className="home__stat">
            <span className="home__stat-label">ASSETS</span>
            <span className="home__stat-value">{money(netWorth.assetsCents)}</span>
          </div>
          <div className="home__stat">
            <span className="home__stat-label">LIABILITIES</span>
            <span className={`home__stat-value${netWorth.liabilitiesCents > 0 ? ' home__stat-value--liability' : ''}`}>
              {netWorth.liabilitiesCents > 0 ? `−${money(netWorth.liabilitiesCents)}` : money(0)}
            </span>
          </div>
        </div>
      ) : null}

      {netWorth && netWorth.unknownAccountIds.length > 0 ? (
        <p className="notice">
          {netWorth.unknownAccountIds.length} account
          {netWorth.unknownAccountIds.length > 1 ? 's are' : ' is'} still syncing — not counted yet.
        </p>
      ) : null}

      <section className="section">
        <h2 className="section__title">Accounts</h2>
        {visibleAccounts.length === 0 ? (
          <EmptyState
            title="No accounts linked"
            body="Connect banks, credit cards, and brokerages like Robinhood — balances and transactions flow in automatically."
          />
        ) : (
          <div className="list">
            {visibleAccounts.map((account) => (
              <AccountCard key={account.id} account={account} onPress={setSelectedAccount} />
            ))}
          </div>
        )}
        <div className="home__link">
          <button type="button" className="button button--primary" onClick={() => void startLink()}>
            Link an account
          </button>
          {linkError ? <p className="notice notice--error">{linkError}</p> : null}
        </div>
      </section>

      {linkToken ? (
        <PlaidLauncher
          token={linkToken}
          onSuccess={(publicToken) => void exchangePublicToken(publicToken)}
          onDone={() => setLinkToken(null)}
        />
      ) : null}

      <BottomSheet
        open={selectedAccount !== null}
        onClose={() => setSelectedAccount(null)}
        title={selectedAccount ? `${selectedAccount.name}${selectedAccount.mask ? ` ••${selectedAccount.mask}` : ''}` : undefined}
      >
        {selectedAccount ? (
          <div className="home__account-sheet">
            <div className="field">
              <span className="field__label">Current balance</span>
              <span className="home__account-balance">
                {moneyOrDash(selectedAccount.currentBalanceCents ?? selectedAccount.holdingsValueCents)}
              </span>
            </div>
            {selectedAccount.holdings.length > 0 ? (
              <div className="list">
                {selectedAccount.holdings.map((holding) => (
                  <div key={holding.id} className="home__holding">
                    <span className="home__holding-symbol">{holding.symbol ?? holding.name ?? '—'}</span>
                    <span className="home__holding-value">{moneyOrDash(holding.valueCents)}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {selectedAccount.plaidLinked ? (
              <div className="home__account-actions">
                <button
                  type="button"
                  className={`button button--ghost${syncing ? ' button--disabled' : ''}`}
                  onClick={() => void doSync(selectedAccount)}
                >
                  {syncing ? 'Syncing…' : 'Sync now'}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
