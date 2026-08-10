import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import {
  useAdminNotificationLog,
  useNotificationAudience,
  useSendNotification,
  useTestNotification,
  type AdminNotificationResult,
  type NotificationCategory,
  type NotificationRow,
} from "@loupe/core";
import { Button, Skeleton, TextField, SegmentedControl } from "@/components";
import { notify } from "@/stores/noticeStore";
import styles from "./AdminNotifications.module.scss";
import admin from "../admin.module.scss";

const CATEGORIES: { key: NotificationCategory; label: string }[] = [
  { key: "news", label: "News" },
  { key: "market", label: "Market" },
  { key: "social", label: "Community" },
  { key: "billing", label: "Billing" },
  { key: "system", label: "System" },
];

/**
 * Admin: compose a real notification and send it to one user or everyone.
 *
 * The push counterpart to the email announcement composer. Nothing here is a
 * banner or a hint — a send writes a durable row in every recipient's inbox
 * and (optionally) buzzes their phone, so the page is built around knowing the
 * blast radius *before* you press the button: live audience counts, a
 * test-to-yourself rail, and a two-step arm on the broadcast.
 */
export function AdminNotifications() {
  const audienceQ = useNotificationAudience();
  const logQ = useAdminNotificationLog(1, 15);
  const send = useSendNotification();
  const test = useTestNotification();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("");
  const [category, setCategory] = useState<NotificationCategory>("news");
  const [userId, setUserId] = useState("");
  const [push, setPush] = useState(true);
  // Two-step arm: a broadcast reaches every phone at once, and there is no
  // undo. The first click only reveals the confirm.
  const [armed, setArmed] = useState(false);

  const payload = useMemo(
    () => ({
      title: title.trim(),
      body: body.trim() || null,
      category,
      href: href.trim() || null,
      user_id: userId.trim() || null,
      push,
    }),
    [title, body, category, href, userId, push],
  );

  const valid = payload.title.length > 0;
  const targeted = Boolean(payload.user_id);
  const reach = targeted ? 1 : (audienceQ.data?.users ?? 0);

  function sendTest() {
    if (!valid) return;
    test.mutate(payload, {
      onSuccess: () => notify.success("Sent to you — check your phone and inbox."),
      onError: () => notify.error("Couldn't send the test."),
    });
  }

  function doSend() {
    if (!valid) return;
    send.mutate(payload, {
      onSuccess: (r: AdminNotificationResult) => {
        setArmed(false);
        setTitle("");
        setBody("");
        setHref("");
        notify.success(
          targeted
            ? "Notification delivered."
            : `Sent to ${r.created.toLocaleString()} ${
                r.created === 1 ? "person" : "people"
              }.`,
        );
      },
      onError: () => {
        setArmed(false);
        notify.error("Couldn't send — nothing was delivered.");
      },
    });
  }

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Notifications</h1>
          <p className={admin.subtitle}>
            Write once — it lands in the in-app inbox and, if you want, on their
            lock screen. Every send is recorded and audit-logged.
          </p>
        </div>
      </div>

      {/* Reach, before anything is written. `devices` is registered push
          tokens; the gap to `push_enabled` is people who never installed. */}
      <div className={styles.stats}>
        {audienceQ.isLoading ? (
          <Skeleton height={64} />
        ) : (
          <>
            <Stat label="Active users" value={audienceQ.data?.users ?? 0} />
            <Stat label="Registered devices" value={audienceQ.data?.devices ?? 0} />
            <Stat label="Push enabled" value={audienceQ.data?.push_enabled ?? 0} />
          </>
        )}
      </div>

      <div className={admin.form}>
        <div className={admin.field}>
          <TextField
            id="notif-title"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Evolving Skies prices are moving"
            maxLength={200}
          />
        </div>

        <div className={admin.field}>
          <label className={admin.label} htmlFor="notif-body">
            Body
          </label>
          <textarea
            id="notif-body"
            className={admin.textarea}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="One or two lines. This is the push preview text."
            rows={3}
            maxLength={2000}
          />
        </div>

        <div className={admin.formRow}>
          <div className={admin.field}>
            <label className={admin.label}>Category</label>
            <SegmentedControl
              aria-label="Notification category"
              value={category}
              onChange={(v) => setCategory(v)}
              options={CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
            />
          </div>
        </div>

        <div className={admin.formRow}>
          <div className={admin.field}>
            <TextField
              id="notif-href"
              label="Link (optional)"
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="/app/vault"
            />
            <p className={styles.hint}>
              An in-app path, not a URL — both clients resolve it with their own
              navigator.
            </p>
          </div>
          <div className={admin.field}>
            <TextField
              id="notif-user"
              label="Send to one user (optional)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="User ID — leave empty to send to everyone"
            />
          </div>
        </div>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={push}
            onChange={(e) => setPush(e.target.checked)}
          />
          <span>
            Also push to devices
            <em className={styles.toggleHint}>
              Off writes it to the inbox without interrupting anyone.
            </em>
          </span>
        </label>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={sendTest} disabled={!valid || test.isPending}>
            {test.isPending ? "Sending…" : "Send test to me"}
          </Button>

          {armed ? (
            <div className={styles.confirm}>
              <span className={styles.confirmText}>
                {targeted
                  ? "Send to this user?"
                  : `Send to ${reach.toLocaleString()} ${reach === 1 ? "person" : "people"}? This can't be undone.`}
              </span>
              <Button variant="ghost" onClick={() => setArmed(false)}>
                Cancel
              </Button>
              <Button onClick={doSend} disabled={send.isPending}>
                {send.isPending ? "Sending…" : "Yes, send"}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setArmed(true)} disabled={!valid}>
              <Send size={15} />
              {targeted ? "Send to user" : `Send to ${reach.toLocaleString()}`}
            </Button>
          )}
        </div>
      </div>

      <h2 className={styles.logTitle}>Recently sent</h2>
      {logQ.isLoading ? (
        <Skeleton height={180} />
      ) : (logQ.data?.items?.length ?? 0) === 0 ? (
        <p className={admin.subtitle}>Nothing sent yet.</p>
      ) : (
        <ul className={admin.list}>
          {(logQ.data?.items ?? []).map((n: NotificationRow) => (
            <li key={n.id} className={admin.row}>
              <div>
                <strong>{n.title}</strong>
                {n.body ? <p className={styles.logBody}>{n.body}</p> : null}
              </div>
              <span className={admin.badge}>{n.kind}</span>
              <span className={styles.logTime}>
                {new Date(n.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value.toLocaleString()}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
