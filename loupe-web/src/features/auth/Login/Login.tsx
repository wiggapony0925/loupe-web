import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError, type User } from "@loupe/core";
import { Button, TextField } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { useResolveNavKey } from "@/hooks/useNavKey";
import { AuthLayout } from "../AuthLayout/AuthLayout";
import { SocialSignIn } from "../SocialSignIn/SocialSignIn";
import { loginSchema, type LoginValues } from "../authSchemas";
import styles from "../AuthForm.module.scss";

/** Email + password sign-in, wired to `POST /v1/auth/login`. Accounts with
 *  two-factor enabled get a second step (code entry) before they're let in. */
export function Login() {
  const { login, completeMfa, user } = useAuth();
  const navigate = useNavigate();
  // Where to land after sign-in — driven by the nav key the guest arrived with.
  const { to: from } = useResolveNavKey();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  // MFA second step — a separate sub-flow, so it keeps its own local state.
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaBusy, setMfaBusy] = useState(false);

  // Admins land in the developer portal by default; everyone else goes where
  // they were headed. A deep link (`from` other than the default) is respected.
  const destFor = (u: User | null) => (u?.is_admin && from === "/app" ? "/admin" : from);

  // Already signed in? Don't show the form — go where they were headed.
  if (user) return <Navigate to={destFor(user)} replace />;

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      const outcome = await login(email, password);
      if (outcome.status === "mfa") {
        setMfaToken(outcome.mfaToken); // switch to the code step
      } else {
        void navigate(destFor(outcome.user), { replace: true });
      }
    } catch (err) {
      setError("root", {
        message:
          err instanceof ApiError ? err.message : "Couldn't sign in. Please try again.",
      });
    }
  });

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    if (!mfaToken) return;
    setMfaError(null);
    setMfaBusy(true);
    try {
      const signedIn = await completeMfa(mfaToken, code.trim());
      void navigate(destFor(signedIn), { replace: true });
    } catch (err) {
      setMfaError(err instanceof ApiError ? err.message : "That code didn't match.");
    } finally {
      setMfaBusy(false);
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
          {mfaError && <p className={styles.error}>{mfaError}</p>}
          <Button type="submit" block size="lg" disabled={mfaBusy || code.trim().length < 4}>
            {mfaBusy ? "Verifying…" : "Verify & sign in"}
          </Button>
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => {
              setMfaToken(null);
              setCode("");
              setMfaError(null);
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
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail />}
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          icon={<Lock />}
          error={errors.password?.message}
          {...register("password")}
        />
        <Link to="/forgot-password" className={styles.forgot}>
          Forgot password?
        </Link>
        {errors.root && <p className={styles.error}>{errors.root.message}</p>}
        <Button type="submit" block size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <SocialSignIn onSuccess={(u) => navigate(destFor(u), { replace: true })} />
    </AuthLayout>
  );
}
