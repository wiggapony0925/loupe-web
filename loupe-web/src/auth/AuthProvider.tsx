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
import { setSentryUser } from "@/observability/sentry";

const TOKEN_KEY = "loupe.auth.token";
const USER_KEY = "loupe.auth.user";
// Impersonation lives in sessionStorage (per-tab), so it takes precedence over
// the admin's localStorage token *in this tab only* and never overwrites it —
// the admin's session survives in localStorage and other tabs untouched.
const IMP_TOKEN_KEY = "loupe.impersonate.token";
const IMP_EMAIL_KEY = "loupe.impersonate.email";

function impersonationToken(): string | null {
  try {
    return sessionStorage.getItem(IMP_TOKEN_KEY);
  } catch {
    return null;
  }
}
function impersonatingEmail(): string | null {
  try {
    return sessionStorage.getItem(IMP_EMAIL_KEY);
  } catch {
    return null;
  }
}
function isImpersonatingNow(): boolean {
  return Boolean(impersonationToken());
}
function activeToken(): string | null {
  try {
    return impersonationToken() || localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Outcome of an email/password sign-in: either fully signed in, or a 2FA
 *  challenge that must be completed with {@link AuthValue.completeMfa}. */
export type LoginOutcome =
  | { status: "ok"; user: User }
  | { status: "mfa"; mfaToken: string };

function readCachedUser(): User | null {
  // While impersonating, never read the admin's cached user — fetch the target
  // fresh from /me instead (and never persist over the admin's cache below).
  if (isImpersonatingNow()) return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}
function writeCachedUser(u: User | null) {
  if (isImpersonatingNow()) return; // preserve the admin's cached user
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
  /** Change password (verifies current, revokes other sessions, keeps this one). */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Sign in with a Google ID token (from the Google Identity SDK). */
  signInWithGoogle: (idToken: string) => Promise<User>;
  /** Sign in with an Apple identity token (from the Apple JS SDK). */
  signInWithApple: (
    identityToken: string,
    opts?: { nonce?: string; displayName?: string },
  ) => Promise<User>;
  logout: () => void;
  /** Revoke every session for this user (all devices), then sign out here. */
  logoutEverywhere: () => Promise<void>;
  /** True when this tab is viewing the app as another user (super-admin). */
  isImpersonating: boolean;
  /** The impersonated user's email, when {@link isImpersonating}. */
  impersonatingEmail: string | null;
  /** Enter impersonation in this tab with a target token, then open the app. */
  impersonate: (token: string, email: string) => void;
  /** Leave impersonation and return to the admin session. */
  exitImpersonation: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Owns the session: token + cached user persistence, hydration, login/logout.
 * The user object is cached in localStorage and read synchronously on first
 * render, so a returning (logged-in) visitor never flashes login/register —
 * the session is there immediately and `/me` refreshes it in the background.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => readCachedUser());
  const [loading, setLoading] = useState<boolean>(
    () => Boolean(activeToken()) && !readCachedUser(),
  );
  const impersonating = isImpersonatingNow();

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    writeCachedUser(u);
    setSentryUser(u ? { id: u.id, email: u.email } : null);
  }, []);

  // Enter / leave impersonation. Both do a full reload so the whole app
  // re-hydrates cleanly from the (new) active token — entering boots as the
  // target, leaving boots back into the admin session from localStorage.
  const exitImpersonation = useCallback(() => {
    try {
      sessionStorage.removeItem(IMP_TOKEN_KEY);
      sessionStorage.removeItem(IMP_EMAIL_KEY);
    } catch {
      /* ignore */
    }
    window.location.href = "/admin/users";
  }, []);

  const impersonate = useCallback((token: string, email: string) => {
    try {
      sessionStorage.setItem(IMP_TOKEN_KEY, token);
      sessionStorage.setItem(IMP_EMAIL_KEY, email);
    } catch {
      /* ignore */
    }
    window.location.href = "/app";
  }, []);

  const logout = useCallback(() => {
    // While impersonating, "sign out" just ends impersonation — it must never
    // touch the admin's real token.
    if (isImpersonatingNow()) {
      exitImpersonation();
      return;
    }
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    // Clear the HttpOnly auth cookie too (JS can't, so the server does).
    // Best-effort: never block sign-out on the network call.
    void api.auth.logout().catch(() => {});
    setUser(null);
  }, [setUser, exitImpersonation]);

  // Sign out on every device: ask the server to revoke all of this user's
  // tokens (bumps the token epoch), THEN clear the local session. The revoke
  // call needs the current token, so it must run before we drop it.
  const logoutEverywhere = useCallback(async () => {
    // Don't let an impersonation session revoke the target's tokens — just exit.
    if (isImpersonatingNow()) {
      exitImpersonation();
      return;
    }
    await api.auth.logoutAll().catch(() => {
      /* best-effort — still clear locally so the user is signed out here */
    });
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
  }, [setUser, exitImpersonation]);

  // On mount: wire the API client to our token, then refresh the cached session.
  useEffect(() => {
    const onUnauthorized = () => {
      // An impersonation token expiring just drops back to the admin session.
      if (isImpersonatingNow()) {
        exitImpersonation();
        return;
      }
      // A previously-authenticated request 401'd — the session lapsed.
      if (localStorage.getItem(TOKEN_KEY)) {
        notify.error("Your session has expired. Please sign in again.", 6000);
      }
      logout();
    };
    configureApi({ getToken: activeToken, onUnauthorized });
    if (!activeToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    api.me
      .get()
      .then(setUser)
      .catch(() => {
        if (isImpersonatingNow()) exitImpersonation();
        else logout();
      })
      .finally(() => setLoading(false));
  }, [logout, setUser, exitImpersonation]);

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

  // Change password: the server verifies the current one, revokes every OTHER
  // session, and returns a fresh pair stamped with the new token epoch. Adopt it
  // so this device stays signed in while all others are signed out.
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      setSession(
        await api.auth.changePassword({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      );
    },
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
      changePassword,
      signInWithGoogle,
      signInWithApple,
      logout,
      logoutEverywhere,
      isImpersonating: impersonating,
      impersonatingEmail: impersonating ? impersonatingEmail() : null,
      impersonate,
      exitImpersonation,
    }),
    [
      user,
      loading,
      login,
      completeMfa,
      register,
      changePassword,
      signInWithGoogle,
      signInWithApple,
      logout,
      logoutEverywhere,
      impersonating,
      impersonate,
      exitImpersonation,
    ],
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
