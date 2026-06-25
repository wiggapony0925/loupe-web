import { useState, type FormEvent } from "react";
import { KeyRound, Lock } from "lucide-react";
import { ApiError } from "@loupe/core";
import { Panel, Button, TextField } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { notify } from "@/stores/noticeStore";
import styles from "./ChangePasswordCard.module.scss";

/** Settings card to change the account password. On success the backend revokes
 *  every OTHER session and hands back a fresh token for this device, so the user
 *  stays signed in here but is signed out everywhere else. SSO-only accounts get
 *  a friendly 409 message. */
export function ChangePasswordCard() {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit =
    current.length > 0 && next.length >= 8 && next === confirm && !busy;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      notify.success("Password updated. Other devices have been signed out.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't update your password. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel padding="lg">
      <div className={styles.head}>
        <span className={styles.icon}>
          <KeyRound size={18} />
        </span>
        <div>
          <p className={styles.title}>Password</p>
          <p className={styles.desc}>
            Change your password. This signs you out on every other device.
          </p>
        </div>
      </div>

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <TextField
          label="Current password"
          type="password"
          autoComplete="current-password"
          icon={<Lock />}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          icon={<Lock />}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          error={tooShort ? "Use at least 8 characters." : undefined}
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          icon={<Lock />}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? "Passwords don't match." : undefined}
        />
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {busy ? "Updating…" : "Update password"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
