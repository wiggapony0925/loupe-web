import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MailCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, ApiError } from "@loupe/core";
import { Button, TextField } from "@/components";
import { AuthLayout } from "../AuthLayout/AuthLayout";
import { forgotPasswordSchema, type ForgotPasswordValues } from "../authSchemas";
import styles from "../AuthForm.module.scss";

/** "Forgot password?" — request a reset link by email. The server responds
 *  identically whether or not the account exists, and so do we: the success
 *  state never confirms an address has an account. */
export function ForgotPassword() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      await api.auth.forgotPassword(email);
      setSentTo(email);
    } catch (err) {
      setError("root", {
        message:
          err instanceof ApiError && err.status === 429
            ? "Too many requests — wait a few minutes and try again."
            : "Couldn't send the email. Please try again.",
      });
    }
  });

  if (sentTo) {
    return (
      <AuthLayout
        title="Check your inbox"
        subtitle={`If ${sentTo} has a Loupe account, a reset link is on its way. It works for 30 minutes.`}
        footer={
          <>
            Remembered it? <Link to="/login">Back to sign in</Link>
          </>
        }
      >
        <div className={styles.form}>
          <p className={styles.hint}>
            <MailCheck size={14} /> Nothing arriving? Check spam, or the account may
            sign in with Apple or Google instead of a password.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your account email and we'll send a reset link."
      footer={
        <>
          Remembered it? <Link to="/login">Back to sign in</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          icon={<Mail />}
          error={errors.email?.message}
          {...register("email")}
        />
        {errors.root && <p className={styles.error}>{errors.root.message}</p>}
        <Button type="submit" block size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthLayout>
  );
}
