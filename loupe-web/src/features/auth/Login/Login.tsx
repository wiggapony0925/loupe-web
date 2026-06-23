import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { ApiError, type User } from "@loupe/core";
import { Button, TextField } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { AuthLayout } from "../AuthLayout/AuthLayout";
import { SocialSignIn } from "../SocialSignIn/SocialSignIn";
import styles from "../AuthForm.module.scss";

/** Email + password sign-in, wired to `POST /v1/auth/login`. Accounts with
 *  two-factor enabled get a second step (code entry) before they're let in. */
export function Login() {
  const { login, completeMfa, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Set once the password step succeeds but 2FA is required.
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState("");

  // Admins land in the developer portal by default; everyone else goes where
  // they were headed. A deep link (`from` other than the default) is respected.
  const destFor = (u: User | null) => (u?.is_admin && from === "/app" ? "/admin" : from);

  // Already signed in? Don't show the form — go where they were headed.
  if (user) return <Navigate to={destFor(user)} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const outcome = await login(email, password);
      if (outcome.status === "mfa") {
        setMfaToken(outcome.mfaToken); // switch to the code step
      } else {
        navigate(destFor(outcome.user), { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    if (!mfaToken) return;
    setError(null);
    setBusy(true);
    try {
      const signedIn = await completeMfa(mfaToken, code.trim());
      navigate(destFor(signedIn), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That code didn't match.");
    } finally {
      setBusy(false);
    }
  }

  // ── Second step: two-factor code ──
  if (mfaToken) {
    return (
      <AuthLayout
        title="Two-factor authentication"
        subtitle="Enter the 6-digit code from your authenticator app."
      >
        <form className={styles.form} onSubmit={onVerify}>
          <TextField
            label="Authentication code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="123456"
            icon={<ShieldCheck />}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          {error && <p className={styles.error}>{error}</p>}
          <Button type="submit" block size="lg" disabled={busy || code.trim().length < 4}>
            {busy ? "Verifying…" : "Verify & sign in"}
          </Button>
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => {
              setMfaToken(null);
              setCode("");
              setError(null);
            }}
          >
            Use a different account
          </button>
          <p className={styles.hint}>
            Lost your device? Enter one of your backup codes instead.
          </p>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Loupe vault and markets."
      footer={
        <>
          New to Loupe? <Link to="/signup">Create an account</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={onSubmit}>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          icon={<Lock />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className={styles.error}>{error}</p>}
        <Button type="submit" block size="lg" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <SocialSignIn onSuccess={(u) => navigate(destFor(u), { replace: true })} />
    </AuthLayout>
  );
}
