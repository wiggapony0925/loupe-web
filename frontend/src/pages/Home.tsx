/**
 * Home — the loupe-style command center: net worth hero (live-updating while
 * scrubbing the chart), assets/liabilities stats, linked accounts, and the
 * Plaid Link entry point (banks, cards, Robinhood via Plaid Investments).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlaidLink } from 'react-plaid-link';
import { NetWorthChart } from '@/components/NetWorthChart/NetWorthChart';
import { AccountCard } from '@/components/AccountCard/AccountCard';
import { BottomSheet } from '@/components/BottomSheet/BottomSheet';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle';
import { AnimatedNumber } from '@/components/AnimatedNumber/AnimatedNumber';
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
  const navigate = useNavigate();
  const recurring = useLedgerStore((s) => s.recurring);
  const institutions = useLedgerStore((s) => s.institutions);
  const institutionsLoading = useLedgerStore((s) => s.institutionsLoading);
  const searchInstitutions = useLedgerStore((s) => s.searchInstitutions);
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
  const [institutionsOpen, setInstitutionsOpen] = useState(false);
  const [instQuery, setInstQuery] = useState('');
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

  const openInstitutions = (): void => {
    haptics.impactLight();
    setInstQuery('');
    setInstitutionsOpen(true);
  };

  // Debounced institution search while the picker is open.
  useEffect(() => {
    if (!institutionsOpen) return;
    const timer = window.setTimeout(() => {
      void searchInstitutions(instQuery).catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [instQuery, institutionsOpen, searchInstitutions]);

  const pickInstitution = (): void => {
    haptics.impactLight();
    setInstitutionsOpen(false);
    void startLink();
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
    <div className="page page--wide home">
      {/* Desktop carries the wordmark and theme control in the sidebar. */}
      <header className="page__header page__header--mobile-only">
        <span className="home__brand">trackify</span>
        <div className="page__actions">
          <ThemeToggle />
        </div>
      </header>

      <div className="home__columns">
      <div className="home__col-main">
      <div className="home__hero">
        <span className="home__eyebrow">NET WORTH</span>
        <span className="home__value">
          {heroCents === null ? (
            '—'
          ) : (
            <AnimatedNumber value={heroCents} format={moneyHero} instant={scrub !== null} />
          )}
        </span>
        {delta ? (
          <span className={`home__delta${delta.diff < 0 ? ' home__delta--down' : ''}`}>
            <span className="home__delta-arrow" aria-hidden="true">
              {delta.diff < 0 ? '▼' : '▲'}
            </span>
            {signedMoney(delta.diff)}
            {delta.pct !== null ? ` (${delta.pct >= 0 ? '+' : ''}${delta.pct.toFixed(1)}%)` : ''} · {range}
          </span>
        ) : (
          <span className="home__delta home__delta--quiet">
            {scrub ? new Date(scrub.t).toLocaleDateString() : 'as of today'}
          </span>
        )}
      </div>

      <div className="home__quick-row">
        <button type="button" className="home__quick" onClick={openInstitutions}>
          <svg viewBox="0 0 24 24" className="home__quick-icon"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          Link
        </button>
        <button
          type="button"
          className="home__quick"
          onClick={() => {
            haptics.impactLight();
            navigate('/recurring');
          }}
        >
          <svg viewBox="0 0 24 24" className="home__quick-icon"><path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2M20 4v4h-4M4 20v-4h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Recurring
        </button>
        <button
          type="button"
          className="home__quick"
          onClick={() => {
            haptics.impactLight();
            navigate('/ledger');
          }}
        >
          <svg viewBox="0 0 24 24" className="home__quick-icon"><path d="M7 20V10M12 20V4M17 20v-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          Settle up
        </button>
      </div>

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
      </div>

      <div className="home__col-side">
      {recurring && recurring.items.length > 0 ? (
        <button
          type="button"
          className="home__subs"
          onClick={() => {
            haptics.impactLight();
            navigate('/recurring');
          }}
        >
          <span className="home__subs-main">
            <span className="home__subs-title">Recurring</span>
            <span className="home__subs-meta">
              {recurring.items.length} subscription{recurring.items.length === 1 ? '' : 's'} across your
              cards
            </span>
          </span>
          <span className="home__subs-amount">{money(recurring.monthlyTotalCents)}/mo</span>
        </button>
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
            {visibleAccounts.map((account, index) => (
              <AccountCard
                key={account.id}
                account={account}
                onPress={setSelectedAccount}
                enterIndex={Math.min(index, 10)}
              />
            ))}
          </div>
        )}
        <div className="home__link">
          <button type="button" className="button button--primary" onClick={openInstitutions}>
            Link an account
          </button>
          {linkError ? <p className="notice notice--error">{linkError}</p> : null}
        </div>
      </section>
      </div>
      </div>

      {linkToken ? (
        <PlaidLauncher
          token={linkToken}
          onSuccess={(publicToken) => void exchangePublicToken(publicToken)}
          onDone={() => setLinkToken(null)}
        />
      ) : null}

      <BottomSheet
        open={institutionsOpen}
        onClose={() => setInstitutionsOpen(false)}
        title="Link an account"
      >
        <div className="institution-picker">
          <div className="institution-picker__search">
            <input
              className="institution-picker__input"
              placeholder="Search 13,000+ banks & brokerages"
              value={instQuery}
              autoCapitalize="none"
              onChange={(e) => setInstQuery(e.target.value)}
            />
          </div>
          <div className="institution-picker__grid">
            {institutionsLoading && institutions.length === 0
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="institution-picker__cell">
                    <span className="skeleton institution-picker__logo" />
                    <span className="skeleton institution-picker__line" />
                  </div>
                ))
              : institutions.map((inst) => (
                  <button
                    key={inst.id}
                    type="button"
                    className="institution-picker__cell"
                    onClick={pickInstitution}
                  >
                    {inst.logo ? (
                      <img className="institution-picker__logo" src={inst.logo} alt="" />
                    ) : (
                      <span className="institution-picker__logo institution-picker__logo--fallback">
                        {inst.name.charAt(0)}
                      </span>
                    )}
                    <span className="institution-picker__name">{inst.name}</span>
                  </button>
                ))}
          </div>
          {!institutionsLoading && institutions.length === 0 ? (
            <p className="notice">No matches here — Plaid Link can still find it.</p>
          ) : null}
          <div className="institution-picker__footer">
            <button type="button" className="button button--primary" onClick={pickInstitution}>
              Continue with Plaid
            </button>
            <span className="institution-picker__powered">
              Secured by Plaid · 13,000+ institutions supported
            </span>
          </div>
        </div>
      </BottomSheet>

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
