import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, configureApi, type User } from "@loupe/core";
import { notify } from "@/stores/noticeStore";

const TOKEN_KEY = "loupe.auth.token";
const USER_KEY = "loupe.auth.user";

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}
function writeCachedUser(u: User | null) {
  try {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable — non-fatal */
  }
}

interface AuthValue {
  user: User | null;
  isAuthed: boolean;
  /** True only while hydrating a token with no cached user yet (no flash). */
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, displayName?: string) => Promise<User>;
  logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
const AuthContext = createContext<AuthValue | null>(null);

/**
 * Owns the session: token + cached user persistence, hydration, login/logout.
 * The user object is cached in localStorage and read synchronously on first
 * render, so a returning (logged-in) visitor never flashes login/register —
 * the session is there immediately and `/me` refreshes it in the background.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => readCachedUser());
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem(TOKEN_KEY)) && !readCachedUser();
    } catch {
      return false;
    }
  });

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    writeCachedUser(u);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
  }, [setUser]);

  // On mount: wire the API client to our token, then refresh the cached session.
  useEffect(() => {
    const onUnauthorized = () => {
      // A previously-authenticated request 401'd — the session lapsed.
      if (localStorage.getItem(TOKEN_KEY)) {
        notify.error("Your session has expired. Please sign in again.", 6000);
      }
      logout();
    };
    configureApi({ getToken: () => localStorage.getItem(TOKEN_KEY), onUnauthorized });
    const token = (() => {
      try {
        return localStorage.getItem(TOKEN_KEY);
      } catch {
        return null;
      }
    })();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    api.me
      .get()
      .then(setUser)
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout, setUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const tp = await api.auth.login({ email, password });
      localStorage.setItem(TOKEN_KEY, tp.access_token);
      setUser(tp.user);
      return tp.user;
    },
    [setUser],
  );

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const tp = await api.auth.register({ email, password, display_name: displayName });
      localStorage.setItem(TOKEN_KEY, tp.access_token);
      setUser(tp.user);
      return tp.user;
    },
    [setUser],
  );

  const value = useMemo<AuthValue>(
    () => ({ user, isAuthed: Boolean(user), loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access the session. Must be used under <AuthProvider>. */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
