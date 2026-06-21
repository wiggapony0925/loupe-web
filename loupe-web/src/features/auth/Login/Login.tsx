import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock, Mail } from "lucide-react";
import { ApiError, type User } from "@loupe/core";
import { Button, TextField } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { AuthLayout } from "../AuthLayout/AuthLayout";
import { SocialSignIn } from "../SocialSignIn/SocialSignIn";
import styles from "../AuthForm.module.scss";

/** Email + password sign-in, wired to `POST /v1/auth/login`. */
export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      const signedIn = await login(email, password);
      navigate(destFor(signedIn), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign in. Please try again.");
    } finally {
      setBusy(false);
    }
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
