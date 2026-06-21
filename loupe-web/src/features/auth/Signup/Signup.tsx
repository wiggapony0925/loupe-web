import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock, Mail, User } from "lucide-react";
import { ApiError } from "@loupe/core";
import { Button, TextField } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { AuthLayout } from "../AuthLayout/AuthLayout";
import { SocialSignIn } from "../SocialSignIn/SocialSignIn";
import styles from "../AuthForm.module.scss";

/** Account creation, wired to `POST /v1/auth/register`. */
export function Signup() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/app";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(email, password, name || undefined);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create your account. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Track your collection like a portfolio — free to start."
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={onSubmit}>
        <TextField
          label="Display name"
          autoComplete="name"
          placeholder="Jeff Fernandez"
          icon={<User />}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          icon={<Lock />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        {error && <p className={styles.error}>{error}</p>}
        <Button type="submit" block size="lg" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <SocialSignIn onSuccess={() => navigate(from, { replace: true })} />
    </AuthLayout>
  );
}
