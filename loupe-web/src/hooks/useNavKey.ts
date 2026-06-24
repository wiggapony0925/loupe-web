import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import {
  decodeNavKey,
  encodeNavKey,
  logMintedKey,
  mintNavKey,
  NAV_KEY_PARAM,
  navKeyLoginUrl,
  RESUME_PARAM,
  stashPendingKey,
  takePendingKey,
  withResumeParam,
  type NavCardRef,
  type NavIntent,
} from "@/lib/navKeys";

/** Options for {@link useRequestSignIn}'s returned function. */
export interface RequestSignInOpts {
  /** Where to send the user after they sign in. Defaults to the current URL. */
  to?: string;
  /** What they were about to do — auto-resumed on return. Defaults to `page`. */
  intent?: NavIntent;
  /** The card in context, if any. */
  card?: NavCardRef;
  /** Tag for where this came from (route guard, gate button, …). */
  src?: string;
  /** Go to /signup instead of /login. */
  signup?: boolean;
}

/**
 * Returns `requestSignIn(opts)` — mint a nav key from the current context and
 * send the guest to /login (or /signup) carrying it. The key is also stashed in
 * sessionStorage so the intent survives if the `?k=` param is ever dropped.
 *
 * Use this instead of a bare `navigate("/login")` anywhere a guest is bounced to
 * auth, so they come back to exactly where they were — and resume what they were
 * doing.
 */
export function useRequestSignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  return useCallback(
    (opts: RequestSignInOpts = {}) => {
      const intent = opts.intent ?? "page";
      const base = opts.to ?? location.pathname + location.search;
      // For an action intent, bake `?resume=<intent>` into the destination so
      // the page auto-resumes once the user returns signed-in.
      const to = intent === "page" ? base : withResumeParam(base, intent);
      const key = mintNavKey({
        to,
        intent,
        card: opts.card,
        // Stamp the current user when we have one (e.g. a session that lapsed),
        // purely informational — resolve never trusts it for the destination.
        uid: user?.id,
        src: opts.src,
      });
      const token = encodeNavKey(key);
      stashPendingKey(token);
      logMintedKey(key, token);
      void navigate(navKeyLoginUrl(key, opts.signup ? "/signup" : "/login"));
    },
    [navigate, location.pathname, location.search, user?.id],
  );
}

export interface ResolvedNavDestination {
  /** Path to navigate to after auth. */
  to: string;
  /** True when a valid nav key drove this (vs. the `/app` fallback). */
  fromKey: boolean;
}

/**
 * Resolve where an authenticating user should land. Precedence:
 *   1. a valid `?k=` nav key on the URL,
 *   2. the sessionStorage pending key (survives a dropped param),
 *   3. router `state.from` (legacy RequireAuth behaviour),
 *   4. `/app`.
 * Consumes (clears) the pending key so it can't replay on a later visit.
 */
export function useResolveNavKey(): ResolvedNavDestination {
  const [params] = useSearchParams();
  const location = useLocation();
  const paramToken = params.get(NAV_KEY_PARAM);
  const stateFrom = (location.state as { from?: string } | null)?.from;

  // Resolve exactly once (lazy init). The pending key is consumed here, so we
  // must NOT recompute on every render — a later render would find it cleared
  // and wrongly fall back to /app before navigation happens.
  const [resolved] = useState<ResolvedNavDestination>(() => {
    const fromParam = decodeNavKey(paramToken);
    const pending = takePendingKey(); // always consume the backup
    const key = fromParam ?? decodeNavKey(pending);
    if (key) return { to: key.to, fromKey: true };
    if (stateFrom) return { to: stateFrom, fromKey: true };
    return { to: "/app", fromKey: false };
  });
  return resolved;
}

/**
 * On a destination page, auto-resume a gated action once the user returns
 * signed-in. When the URL carries `?resume=<intent>` and matches `intent` and
 * the user is authed, `run()` fires exactly once and the param is stripped (so a
 * refresh doesn't replay it).
 */
export function useResumeOnReturn(intent: NavIntent, run: () => void): void {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const fired = useRef(false);
  const runRef = useRef(run);
  runRef.current = run;

  const wants = params.get(RESUME_PARAM) === intent;

  useEffect(() => {
    if (!wants || fired.current || !user) return;
    fired.current = true;
    runRef.current();
    const next = new URLSearchParams(params);
    next.delete(RESUME_PARAM);
    setParams(next, { replace: true });
  }, [wants, user, params, setParams]);
}
