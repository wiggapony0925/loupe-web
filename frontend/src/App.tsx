/**
 * App shell: auth gate → tabbed layout. Firebase drives the session; the
 * store bootstraps once a verified user appears. Push-notification taps
 * deep-link into the Feed with the tag sheet open.
 */
import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { watchAuth } from '@/lib/firebase';
import { useLedgerStore } from '@/store/useLedgerStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { TabBar } from '@/components/TabBar/TabBar';
import { Home } from '@/pages/Home';
import { Feed } from '@/pages/Feed';
import { Sheet } from '@/pages/Sheet';
import { Ledger } from '@/pages/Ledger';
import { Circles } from '@/pages/Circles';
import { Auth } from '@/pages/Auth';

export function App() {
  const navigate = useNavigate();
  const me = useLedgerStore((s) => s.me);
  const authReady = useLedgerStore((s) => s.authReady);
  const setAuthReady = useLedgerStore((s) => s.setAuthReady);
  const bootstrap = useLedgerStore((s) => s.bootstrap);
  const clearSession = useLedgerStore((s) => s.clearSession);
  const [signedIn, setSignedIn] = useState(false);

  // Status-bar styling lives in ThemeProvider — it follows the theme.

  useEffect(() => {
    const unsubscribe = watchAuth((firebaseUser) => {
      setSignedIn(Boolean(firebaseUser));
      if (firebaseUser) {
        void bootstrap()
          .catch(() => undefined)
          .finally(() => setAuthReady(true));
      } else {
        clearSession();
        setAuthReady(true);
      }
    });
    return unsubscribe;
  }, [bootstrap, clearSession, setAuthReady]);

  const openTransactionFromPush = useCallback(
    (transactionId: string) => navigate(`/feed?txn=${transactionId}`),
    [navigate],
  );
  usePushNotifications(signedIn && me !== null, openTransactionFromPush);

  if (!authReady) {
    return <div className="app-shell" aria-busy="true" />;
  }

  if (!signedIn || !me) {
    return <Auth />;
  }

  return (
    <div className="app-shell">
      <main className="app-shell__main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/sheet" element={<Sheet />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/circles" element={<Circles />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  );
}
