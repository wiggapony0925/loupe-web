import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Copy, Check } from "lucide-react";
import { api, ApiError, type MfaSetup } from "@loupe/core";
import { Panel, Button, Badge, TextField, Modal, Skeleton } from "@/components";
import { notify } from "@/stores/noticeStore";
import styles from "./MfaCard.module.scss";

type Step = "scan" | "backup" | "disable";

/** Settings card to enable/disable TOTP two-factor auth, with a guided
 *  enrollment modal (QR + verify + one-time backup codes). */
export function MfaCard() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("scan");
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    api.auth
      .mfaStatus()
      .then((s) => alive && setEnabled(s.enabled))
      .catch(() => alive && setEnabled(false));
    return () => {
      alive = false;
    };
  }, []);

  function reset() {
    setStep("scan");
    setSetup(null);
    setCode("");
    setBackupCodes([]);
    setError(null);
    setCopied(false);
  }

  async function beginEnroll() {
    reset();
    setBusy(true);
    try {
      const material = await api.auth.mfaSetup();
      setSetup(material);
      setStep("scan");
      setOpen(true);
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : "Couldn't start setup.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll() {
    setError(null);
    setBusy(true);
    try {
      const { backup_codes } = await api.auth.mfaEnable(code.trim());
      setBackupCodes(backup_codes);
      setStep("backup");
      setEnabled(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That code didn't match.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDisable() {
    setError(null);
    setBusy(true);
    try {
      await api.auth.mfaDisable(code.trim());
      setEnabled(false);
      setOpen(false);
      notify.success("Two-factor authentication turned off.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That code didn't match.");
    } finally {
      setBusy(false);
    }
  }

  function openDisable() {
    reset();
    setStep("disable");
    setOpen(true);
  }

  function copyBackup() {
    navigator.clipboard?.writeText(backupCodes.join("\n")).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => notify.error("Couldn't copy — select and copy manually."),
    );
  }

  return (
    <Panel padding="lg">
      <div className={styles.row}>
        <div className={styles.rowText}>
          <p className={styles.rowTitle}>
            Two-factor authentication
            {enabled && (
              <Badge tone="mint" dot>
                On
              </Badge>
            )}
          </p>
          <p className={styles.rowDesc}>
            Require a one-time code from an authenticator app at sign-in. Strongly
            recommended for admin accounts.
          </p>
        </div>
        <div className={styles.rowControl}>
          {enabled === null ? (
            <Skeleton height={32} width={92} radius={8} />
          ) : enabled ? (
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<ShieldOff size={16} />}
              onClick={openDisable}
            >
              Turn off
            </Button>
          ) : (
            <Button
              size="sm"
              leadingIcon={<ShieldCheck size={16} />}
              disabled={busy}
              onClick={beginEnroll}
            >
              {busy ? "Starting…" : "Set up"}
            </Button>
          )}
        </div>
      </div>

      <Modal
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
        title={
          step === "disable"
            ? "Turn off two-factor"
            : step === "backup"
              ? "Save your backup codes"
              : "Set up two-factor"
        }
      >
        {/* ── Scan + verify ── */}
        {step === "scan" && setup && (
          <div className={styles.enroll}>
            <ol className={styles.steps}>
              <li>Scan this QR with Google Authenticator, 1Password, or Authy.</li>
              <li>Enter the 6-digit code it shows to finish.</li>
            </ol>
            <div className={styles.qrWrap}>
              <img className={styles.qr} src={setup.qr_svg} alt="Two-factor QR code" />
            </div>
            <p className={styles.manual}>
              Can&rsquo;t scan? Enter this key:
              <code className={styles.secret}>{setup.secret}</code>
            </p>
            <TextField
              label="Authentication code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {error && <p className={styles.error}>{error}</p>}
            <Button
              block
              disabled={busy || code.trim().length < 4}
              onClick={confirmEnroll}
            >
              {busy ? "Verifying…" : "Verify & enable"}
            </Button>
          </div>
        )}

        {/* ── Backup codes ── */}
        {step === "backup" && (
          <div className={styles.enroll}>
            <p className={styles.manual}>
              Save these one-time codes somewhere safe. Each works once if you lose
              your authenticator. They won&rsquo;t be shown again.
            </p>
            <ul className={styles.codes}>
              {backupCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <div className={styles.enrollActions}>
              <Button
                variant="secondary"
                leadingIcon={copied ? <Check size={16} /> : <Copy size={16} />}
                onClick={copyBackup}
              >
                {copied ? "Copied" : "Copy codes"}
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </div>
          </div>
        )}

        {/* ── Disable ── */}
        {step === "disable" && (
          <div className={styles.enroll}>
            <p className={styles.manual}>
              Enter a current authenticator code (or a backup code) to turn off
              two-factor authentication.
            </p>
            <TextField
              label="Authentication code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {error && <p className={styles.error}>{error}</p>}
            <Button
              block
              variant="danger"
              disabled={busy || code.trim().length < 4}
              onClick={confirmDisable}
            >
              {busy ? "Turning off…" : "Turn off two-factor"}
            </Button>
          </div>
        )}
      </Modal>
    </Panel>
  );
}
