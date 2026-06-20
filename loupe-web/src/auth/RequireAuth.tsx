import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

/** Route guard — waits for hydration, then redirects signed-out users to /login,
 *  remembering where they were headed so login can send them back. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthed, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh", color: "var(--ink-dim)" }}>
        Loading…
      </div>
    );
  }
  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}
