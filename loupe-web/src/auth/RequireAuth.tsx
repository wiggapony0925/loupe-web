import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import {
  encodeNavKey,
  logMintedKey,
  mintNavKey,
  navKeyLoginUrl,
  stashPendingKey,
} from "@/lib/navKeys";

/** Route guard — waits for hydration, then redirects signed-out users to /login,
 *  minting a nav key so login can send them right back to where they were headed
 *  (the key rides on the URL *and* sessionStorage, so it survives a reload). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthed, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh", color: "var(--ink-dim)" }}>
        Loading…
      </div>
    );
  }
  if (!isAuthed) {
    const to = location.pathname + location.search;
    const key = mintNavKey({ to, intent: "page", uid: user?.id, src: "route-guard" });
    const token = encodeNavKey(key);
    stashPendingKey(token);
    logMintedKey(key, token);
    // `state.from` kept for backward-compatibility with anything reading it.
    return <Navigate to={navKeyLoginUrl(key)} replace state={{ from: to }} />;
  }
  return <>{children}</>;
}
