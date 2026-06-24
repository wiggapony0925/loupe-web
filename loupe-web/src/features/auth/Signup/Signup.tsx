import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock, Mail, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError } from "@loupe/core";
import { Button, TextField } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { AuthLayout } from "../AuthLayout/AuthLayout";
import { SocialSignIn } from "../SocialSignIn/SocialSignIn";
import { signupSchema, type SignupValues } from "../authSchemas";
import styles from "../AuthForm.module.scss";

/** Account creation, wired to `POST /v1/auth/register`. */
export function Signup() {
  const { register: registerAccount, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/app";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  if (user) return <Navigate to={from} replace />;

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    try {
      await registerAccount(email, password, name || undefined);
      void navigate(from, { replace: true });
    } catch (err) {
      setError("root", {
        message:
          err instanceof ApiError
            ? err.message
            : "Couldn't create your account. Please try again.",
      });
    }
  });

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
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <TextField
          label="Display name"
          autoComplete="name"
          placeholder="Jeff Fernandez"
          icon={<User />}
          error={errors.name?.message}
          {...register("name")}
        />
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          icon={<Lock />}
          error={errors.password?.message}
          {...register("password")}
        />
        {errors.root && <p className={styles.error}>{errors.root.message}</p>}
        <Button type="submit" block size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <SocialSignIn onSuccess={() => navigate(from, { replace: true })} />
    </AuthLayout>
  );
}
