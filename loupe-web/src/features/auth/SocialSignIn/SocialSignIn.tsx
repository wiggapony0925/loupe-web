import { useEffect, useRef, useState } from "react";
import type { User } from "@loupe/core";
import { useAuth } from "@/auth/AuthProvider";
import { useScript } from "@/hooks/useScript";
import {
  APPLE_CLIENT_ID,
  APPLE_JS_SRC,
  GOOGLE_CLIENT_ID,
  GOOGLE_GSI_SRC,
  hasSocialSignIn,
} from "./oauthConfig";
import styles from "./SocialSignIn.module.scss";

/* Minimal globals injected by the provider SDKs. */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (config: Record<string, unknown>) => void;
        signIn: () => Promise<{
          authorization: { id_token: string };
          user?: { name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

/**
 * Social sign-in block (Google + Apple), shared by Login and Signup. Each
 * provider renders only when its client id is configured (see `oauthConfig`),
 * so an un-provisioned environment shows nothing and the email form is
 * untouched. Both flows funnel through `AuthProvider` → one session path.
 */
export function SocialSignIn({
  onSuccess,
}: {
  onSuccess: (user: User) => void;
}) {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Latest handlers, so the once-registered GSI callback never goes stale.
  const handlers = useRef({ signInWithGoogle, onSuccess, setError });
  handlers.current = { signInWithGoogle, onSuccess, setError };

  const googleStatus = useScript(GOOGLE_CLIENT_ID ? GOOGLE_GSI_SRC : null);
  const appleStatus = useScript(APPLE_CLIENT_ID ? APPLE_JS_SRC : null);

  // ── Google: initialize + render the official GSI button ──
  useEffect(() => {
    if (googleStatus !== "ready" || !GOOGLE_CLIENT_ID) return;
    const g = window.google;
    const mount = googleBtnRef.current;
    if (!g || !mount) return;

    g.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (resp) => {
        // GSI's callback type is `() => void`; run the async sign-in as a
        // fire-and-forget IIFE so we don't hand it a Promise.
        void (async () => {
          try {
            const user = await handlers.current.signInWithGoogle(resp.credential);
            handlers.current.onSuccess(user);
          } catch {
            handlers.current.setError("Google sign-in failed. Please try again.");
          }
        })();
      },
    });

    const dark = document.documentElement.dataset.theme === "dark";
    const width = Math.min(Math.max(mount.offsetWidth || 320, 200), 400);
    mount.innerHTML = "";
    g.accounts.id.renderButton(mount, {
      type: "standard",
      theme: dark ? "filled_black" : "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      logo_alignment: "center",
      width,
    });
  }, [googleStatus]);

  // ── Apple: init the SDK; the button calls signIn() on click ──
  useEffect(() => {
    if (appleStatus !== "ready" || !APPLE_CLIENT_ID || !window.AppleID) return;
    window.AppleID.auth.init({
      clientId: APPLE_CLIENT_ID,
      scope: "name email",
      redirectURI: window.location.origin + "/login",
      usePopup: true,
    });
  }, [appleStatus]);

  async function handleApple() {
    if (!window.AppleID) return;
    try {
      const data = await window.AppleID.auth.signIn();
      const name = data.user?.name;
      const displayName = name
        ? [name.firstName, name.lastName].filter(Boolean).join(" ")
        : undefined;
      const user = await signInWithApple(data.authorization.id_token, {
        displayName,
      });
      onSuccess(user);
    } catch {
      setError("Apple sign-in failed. Please try again.");
    }
  }

  if (!hasSocialSignIn) return null;

  return (
    <div className={styles.social}>
      <div className={styles.divider}>
        <span>or continue with</span>
      </div>

      {GOOGLE_CLIENT_ID && <div ref={googleBtnRef} className={styles.google} />}

      {APPLE_CLIENT_ID && (
        <button type="button" className={styles.apple} onClick={handleApple}>
          <svg viewBox="0 0 14 17" width="15" height="17" aria-hidden focusable="false">
            <path
              fill="currentColor"
              d="M11.6 9c0-1.6.7-2.8 2-3.5-.7-1-1.8-1.6-3.2-1.7-1.3-.1-2.8.8-3.3.8-.6 0-1.8-.8-2.8-.8C2.2 3.9.6 5 0 7.2c-1.2 2.6-.3 6.4 1 8.5.6 1 1.4 2.2 2.4 2.1 1-.04 1.3-.7 2.5-.7 1.2 0 1.5.7 2.5.6 1-.02 1.7-1 2.4-2 .5-.8.8-1.6 1-2.4-1.7-.6-2.2-2-2.2-2.3Zm-2.1-6c.6-.7.9-1.6.8-2.6-.9.06-1.8.5-2.4 1.2-.6.6-.9 1.5-.8 2.5.9.04 1.8-.4 2.4-1.1Z"
            />
          </svg>
          Continue with Apple
        </button>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
