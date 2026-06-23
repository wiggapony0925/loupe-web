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

/** Outcome of an email/password sign-in: either fully signed in, or a 2FA
 *  challenge that must be completed with {@link AuthValue.completeMfa}. */
export type LoginOutcome =
  | { status: "ok"; user: User }
  | { status: "mfa"; mfaToken: string };

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
  /** Email + password sign-in. Resolves `{status:"ok"}` when signed in, or
   *  `{status:"mfa"}` when a second factor is needed (then call completeMfa). */
  login: (email: string, password: string) => Promise<LoginOutcome>;
  /** Finish a 2FA sign-in with the challenge token + a TOTP/backup code. */
  completeMfa: (mfaToken: string, code: string) => Promise<User>;
  register: (email: string, password: string, displayName?: string) => Promise<User>;
  /** Sign in with a Google ID token (from the Google Identity SDK). */
  signInWithGoogle: (idToken: string) => Promise<User>;
  /** Sign in with an Apple identity token (from the Apple JS SDK). */
  signInWithApple: (
    identityToken: string,
    opts?: { nonce?: string; displayName?: string },
  ) => Promise<User>;
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
    // Clear the HttpOnly auth cookie too (JS can't, so the server does).
    // Best-effort: never block sign-out on the network call.
    void api.auth.logout().catch(() => {});
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

  // Single place that persists a fresh TokenPair → token + user. Every sign-in
  // path (email, register, Google, Apple, MFA) funnels through here.
  const setSession = useCallback(
    (s: { access_token: string; user: User }) => {
      localStorage.setItem(TOKEN_KEY, s.access_token);
      setUser(s.user);
      return s.user;
    },
    [setUser],
  );

  const login = useCallback(
    async (email: string, password: string): Promise<LoginOutcome> => {
      const res = await api.auth.login({ email, password });
      // 2FA-enabled account: tokens withheld until the code is verified.
      if (res.mfa_required && res.mfa_token) {
        return { status: "mfa", mfaToken: res.mfa_token };
      }
      if (res.access_token && res.user) {
        setSession({ access_token: res.access_token, user: res.user });
        return { status: "ok", user: res.user };
      }
      throw new Error("Unexpected sign-in response");
    },
    [setSession],
  );

  const completeMfa = useCallback(
    async (mfaToken: string, code: string) =>
      setSession(await api.auth.mfaVerify({ mfa_token: mfaToken, code })),
    [setSession],
  );

  const register = useCallback(
    async (email: string, password: string, displayName?: string) =>
      setSession(
        await api.auth.register({ email, password, display_name: displayName }),
      ),
    [setSession],
  );

  const signInWithGoogle = useCallback(
    async (idToken: string) =>
      setSession(await api.auth.google({ id_token: idToken })),
    [setSession],
  );

  const signInWithApple = useCallback(
    async (
      identityToken: string,
      opts?: { nonce?: string; displayName?: string },
    ) =>
      setSession(
        await api.auth.apple({
          identity_token: identityToken,
          nonce: opts?.nonce,
          display_name: opts?.displayName,
        }),
      ),
    [setSession],
  );

  const value = useMemo<AuthValue>(
    () => ({
      user,
      isAuthed: Boolean(user),
      loading,
      login,
      completeMfa,
      register,
      signInWithGoogle,
      signInWithApple,
      logout,
    }),
    [user, loading, login, completeMfa, register, signInWithGoogle, signInWithApple, logout],
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
