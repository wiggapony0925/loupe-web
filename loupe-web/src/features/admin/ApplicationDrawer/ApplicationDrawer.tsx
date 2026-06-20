import { useEffect, useState } from "react";
import { ExternalLink, Send } from "lucide-react";
import {
  useAdminApplication,
  useUpdateApplicationStatus,
  type ApplicationStatus,
} from "@loupe/core";
import { Button, Modal, Skeleton } from "@/components";
import { STATUS_LABEL, STATUS_ORDER, STATUS_TONE } from "@/features/site/applicationStatus";
import styles from "./ApplicationDrawer.module.scss";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

interface ApplicationDrawerProps {
  applicationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Admin: review one application and advance its status (optionally notifying). */
export function ApplicationDrawer({ applicationId, open, onOpenChange }: ApplicationDrawerProps) {
  const { data: app, isLoading } = useAdminApplication(applicationId ?? "", open && Boolean(applicationId));
  const updateStatus = useUpdateApplicationStatus();

  const [status, setStatus] = useState<ApplicationStatus>("submitted");
  const [message, setMessage] = useState("");
  const [notify, setNotify] = useState(true);

  // Sync the form to the loaded application each time it opens / changes.
  useEffect(() => {
    if (app) {
      setStatus(app.status);
      setMessage("");
      setNotify(true);
    }
  }, [app?.id, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = () => {
    if (!app) return;
    updateStatus.mutate({ id: app.id, input: { status, message: message.trim() || null, notify } });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={app ? app.applicantName : "Application"}
      description={app ? `${app.jobTitle ?? "Role"} · applied ${fmt(app.createdAt)}` : undefined}
      footer={
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      {isLoading || !app ? (
        <Skeleton height={280} radius={12} />
      ) : (
        <div className={styles.drawer}>
          <section className={styles.contact}>
            <a className={styles.contact__item} href={`mailto:${app.applicantEmail}`}>
              {app.applicantEmail}
            </a>
            {app.linkedinUrl && (
              <a className={styles.contact__item} href={app.linkedinUrl} target="_blank" rel="noreferrer">
                LinkedIn <ExternalLink size={12} />
              </a>
            )}
            {app.resumeUrl && (
              <a className={styles.contact__item} href={app.resumeUrl} target="_blank" rel="noreferrer">
                Resume <ExternalLink size={12} />
              </a>
            )}
          </section>

          {app.coverLetter && (
            <section className={styles.letter}>
              <h3 className={styles.h3}>Cover note</h3>
              <p className={styles.letter__body}>{app.coverLetter}</p>
            </section>
          )}

          <section className={styles.update}>
            <h3 className={styles.h3}>Update status</h3>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="app-status">
                New status
              </label>
              <select
                id="app-status"
                className={styles.select}
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="app-msg">
                Message to applicant (optional)
              </label>
              <textarea
                id="app-msg"
                className={styles.textarea}
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="They'll see this on their tracking page."
              />
            </div>
            <label className={styles.notify}>
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              Notify the applicant of this update
            </label>
            <div>
              <Button onClick={send} disabled={updateStatus.isPending} leadingIcon={<Send size={16} />}>
                {updateStatus.isPending ? "Saving…" : "Send update"}
              </Button>
            </div>
            {updateStatus.isError && <p className={styles.error}>Couldn't update — please try again.</p>}
          </section>

          <section className={styles.trail}>
            <h3 className={styles.h3}>History</h3>
            <ol className={styles.timeline}>
              {[...app.events].reverse().map((ev) => (
                <li key={ev.id} className={styles.event}>
                  <span className={styles.event__dot} data-tone={STATUS_TONE[ev.status]} />
                  <div className={styles.event__body}>
                    <span className={styles.event__status}>
                      {STATUS_LABEL[ev.status]}
                      {ev.notified && <span className={styles.event__notified}>· notified</span>}
                    </span>
                    {ev.message && <p className={styles.event__message}>{ev.message}</p>}
                    <span className={styles.event__time}>{fmt(ev.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </Modal>
  );
}
