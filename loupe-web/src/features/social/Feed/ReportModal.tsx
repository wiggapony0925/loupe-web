import { useState } from "react";
import { useReportContent, useReportReasons } from "@loupe/core";
import { Button, Modal } from "@/components";
import { cx } from "@/lib/cx";
import styles from "./Feed.module.scss";

export interface ReportTarget {
  type: "post" | "comment" | "profile";
  id: string;
  /** Whose content it is — shown so nobody reports the wrong thing. */
  label: string;
}

/**
 * Report a post, comment or profile.
 *
 * The reasons come from the SERVER, not a hardcoded list here: the same
 * closed set has to reach the native app and the moderation queue, and a
 * reason one client can send but another can't is a reason nobody counts.
 *
 * Reporting the same thing twice is idempotent server-side, so the button
 * doesn't need to guard against a second tap — and a person who reports
 * again after nothing happened isn't punished with an error.
 */
export function ReportModal({
  target,
  onClose,
}: {
  target: ReportTarget | null;
  onClose: () => void;
}) {
  const { data: reasons } = useReportReasons(Boolean(target));
  const report = useReportContent();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  const close = () => {
    setReason(null);
    setNote("");
    setDone(false);
    onClose();
  };

  const submit = () => {
    if (!target || !reason) return;
    report.mutate(
      { targetType: target.type, targetId: target.id, reason, note: note.trim() },
      { onSuccess: () => setDone(true) },
    );
  };

  return (
    <Modal
      open={Boolean(target)}
      onOpenChange={(next) => !next && close()}
      title={done ? "Thanks — we're on it" : "Report this"}
      description={
        done
          ? undefined
          : `${target?.label ?? ""} — tell us what's wrong and a moderator will look.`
      }
      size="sm"
      footer={
        done ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button disabled={!reason || report.isPending} onClick={submit}>
              {report.isPending ? "Sending…" : "Report"}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <p className={styles.reportDone}>
          It&rsquo;s in the review queue. We don&rsquo;t tell the other person
          who reported them.
        </p>
      ) : (
        <div className={styles.reportBody}>
          <ul className={styles.reasons}>
            {Object.entries(reasons ?? {}).map(([key, label]) => (
              <li key={key}>
                <button
                  type="button"
                  className={cx(styles.reason, reason === key && styles.reasonOn)}
                  aria-pressed={reason === key}
                  onClick={() => setReason(key)}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
          <textarea
            className={styles.reportNote}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 1000))}
            placeholder="Anything else we should know? (optional)"
            aria-label="Report details"
            rows={3}
          />
          {report.isError && (
            <p className={styles.composerError}>
              {report.error?.message || "Couldn't send that. Try again."}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
