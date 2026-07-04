import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError } from "@loupe/core";
import { Button, TextField } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { AuthLayout } from "../AuthLayout/AuthLayout";
import { resetPasswordSchema, type ResetPasswordValues } from "../authSchemas";
import styles from "../AuthForm.module.scss";

/** Landing page for the emailed reset link (`/reset-password?token=…`).
 *  A successful reset revokes every other session and signs this device in. */
export function ResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = handleSubmit(async ({ password }) => {
    try {
      await resetPassword(token, password);
      void navigate("/app", { replace: true });
    } catch (err) {
      setError("root", {
        message:
          err instanceof ApiError && err.status === 400
            ? "That reset link is invalid or has expired. Request a new one."
            : "Couldn't reset the password. Please try again.",
      });
    }
  });

  if (!token) {
    return (
      <AuthLayout
        title="Link missing"
        subtitle="This page needs the reset link from your email."
        footer={
          <>
            Need one? <Link to="/forgot-password">Request a reset link</Link>
          </>
        }
      >
        <div className={styles.form}>
          <p className={styles.hint}>
            Open the &ldquo;Reset your password&rdquo; email and tap the button again.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="This signs you out everywhere else, then signs you in here."
      footer={
        <>
          Link expired? <Link to="/forgot-password">Request a new one</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          autoFocus
          placeholder="••••••••"
          icon={<Lock />}
          error={errors.password?.message}
          {...register("password")}
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          icon={<Lock />}
          error={errors.confirm?.message}
          {...register("confirm")}
        />
        {errors.root && <p className={styles.error}>{errors.root.message}</p>}
        <Button type="submit" block size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Resetting…" : "Reset password & sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
