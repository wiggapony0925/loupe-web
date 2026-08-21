/**
 * App shell: auth gate → tabbed layout. Firebase drives the session; the
 * store bootstraps once a verified user appears. Push-notification taps
 * deep-link into the Feed with the tag sheet open.
 */
import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { watchAuth } from '@/lib/firebase';
import { useLedgerStore } from '@/store/useLedgerStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { onAppResume, onDeepLink, onHardwareBack } from '@/native/appEvents';
import { subscribeConnectivity } from '@/native/network';
import { hideSplash } from '@/native/splash';
import { TabBar } from '@/components/TabBar/TabBar';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { Home } from '@/pages/Home';
import { Feed } from '@/pages/Feed';
import { Sheet } from '@/pages/Sheet';
import { Ledger } from '@/pages/Ledger';
import { Circles } from '@/pages/Circles';
import { Recurring } from '@/pages/Recurring';
import { Auth } from '@/pages/Auth';

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const me = useLedgerStore((s) => s.me);
  const authReady = useLedgerStore((s) => s.authReady);
  const setAuthReady = useLedgerStore((s) => s.setAuthReady);
  const bootstrap = useLedgerStore((s) => s.bootstrap);
  const clearSession = useLedgerStore((s) => s.clearSession);
  const [signedIn, setSignedIn] = useState(false);
  const [offline, setOffline] = useState(false);

  // Status-bar styling lives in ThemeProvider — it follows the theme.

  // ── Native bridges ─────────────────────────────────────────────────────
  useEffect(() => subscribeConnectivity((connected) => setOffline(!connected)), []);

  // Native splash holds until auth resolves — never a half-hydrated frame.
  useEffect(() => {
    if (authReady) hideSplash();
  }, [authReady]);

  // Returning to the app = fresh feed and net worth, no pull-to-refresh tax.
  useEffect(() => {
    if (!signedIn || !me) return;
    return onAppResume(() => {
      const store = useLedgerStore.getState();
      void store.loadFeed(true).catch(() => undefined);
      void store.loadNetWorth().catch(() => undefined);
    });
  }, [signedIn, me]);

  // trackify://feed?txn=… and universal links land on in-app routes.
  useEffect(() => onDeepLink((path) => navigate(path)), [navigate]);

  // Android hardware back: navigate back in-app; background the app at root.
  useEffect(
    () =>
      onHardwareBack(() => {
        if (location.pathname !== '/') {
          navigate(-1);
          return { handled: true };
        }
        return { handled: false };
      }),
    [navigate, location.pathname],
  );

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
      {offline ? (
        <div className="offline-banner" role="status">
          <span className="offline-banner__dot" aria-hidden="true" />
          Offline — showing what's cached
        </div>
      ) : null}
      {/* CSS picks the form factor: rail ≥ md, floating tab bar below. */}
      <Sidebar />
      <main className="app-shell__main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/sheet" element={<Sheet />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/circles" element={<Circles />} />
          <Route path="/recurring" element={<Recurring />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  );
}
