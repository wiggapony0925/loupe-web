import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AtSign,
  CheckCircle2,
  Mail,
  Megaphone,
  MonitorSmartphone,
  RotateCw,
  Send,
  Users,
  XCircle,
} from "lucide-react";
import {
  useAdminAnnouncementPreview,
  useAdminAnnouncementSend,
  useAdminEmailLog,
  useAdminEmailLogEntry,
  useAdminEmailLogRetry,
  useAdminEmailTemplate,
  useAdminEmailTemplates,
  useAdminEmailTest,
  useAdminSupportSend,
  type AnnouncementDraft,
  type EmailLogStatus,
  type EmailTemplateSummary,
} from "@loupe/core";
import { Badge, Button, NoteCard, SegmentedControl, Skeleton, TextField } from "@/components";
import { cx } from "@/lib/cx";
import styles from "./AdminEmail.module.scss";
import admin from "../admin.module.scss";

type Mode = "templates" | "compose" | "activity";
type View = "html" | "text";
type Width = "desktop" | "mobile";

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: "templates", label: "Templates" },
  { value: "compose", label: "Compose" },
  { value: "activity", label: "Activity" },
];

const STATUS_TONE: Record<EmailLogStatus, "neutral" | "blue" | "mint" | "rose" | "amber"> = {
  queued: "neutral",
  sent: "blue",
  delivered: "mint",
  failed: "rose",
  bounced: "rose",
  complained: "amber",
};

const STATUS_FILTERS: { value: EmailLogStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "delivered", label: "Delivered" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "bounced", label: "Bounced" },
];

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: "html", label: "HTML" },
  { value: "text", label: "Plain text" },
];

const WIDTH_OPTIONS: { value: Width; label: string }[] = [
  { value: "desktop", label: "Desktop" },
  { value: "mobile", label: "Mobile" },
];

type Audience = "subscribers" | "user";

const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: "subscribers", label: "All subscribers" },
  { value: "user", label: "One user" },
];

/**
 * Developer Portal · Email.
 *
 * The template gallery for every transactional email the app sends — welcome,
 * security notices, billing, price alerts, waitlist, blog announcements. Each
 * preview is rendered by the exact production builder with sample data, so
 * what you see here is what users receive. "Send test" delivers the real
 * message to your own admin address.
 */
export function AdminEmail() {
  const { data, isLoading, isError } = useAdminEmailTemplates();
  // Deep link from the Users page: /admin/email?to=user@example.com opens
  // the composer aimed at that one user (support mode).
  const [params] = useSearchParams();
  const initialTo = params.get("to") ?? "";
  const [mode, setMode] = useState<Mode>(initialTo ? "compose" : "templates");
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<View>("html");
  const [width, setWidth] = useState<Width>("desktop");

  const templates = useMemo(() => data?.templates ?? [], [data]);
  useEffect(() => {
    const first = templates[0];
    if (!selected && first) setSelected(first.key);
  }, [selected, templates]);

  const groups = useMemo(() => {
    const map = new Map<string, EmailTemplateSummary[]>();
    for (const t of templates) {
      const list = map.get(t.group);
      if (list) list.push(t);
      else map.set(t.group, [t]);
    }
    return [...map.entries()];
  }, [templates]);

  const render = useAdminEmailTemplate(selected);
  const test = useAdminEmailTest();

  const status = data?.status;
  const active = templates.find((t) => t.key === selected);

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Email</h1>
          <p className={admin.subtitle}>
            Every transactional email the app can send, rendered by the exact production
            templates with sample data. Send any of them to your own address to check a real
            inbox.
          </p>
        </div>
        <div className={admin.toolbar}>
          {status &&
            (status.enabled ? (
              <Badge tone="mint" dot>
                Resend · {status.fromEmail}
              </Badge>
            ) : (
              <Badge tone="amber">Provider not configured</Badge>
            ))}
          <SegmentedControl
            options={MODE_OPTIONS}
            value={mode}
            onChange={setMode}
            aria-label="Gallery or composer"
          />
        </div>
      </div>

      {!status?.enabled && !isLoading && !isError && (
        <NoteCard
          title="Sends are disabled"
          message="Previews work without a provider. To deliver test emails, set RESEND_API_KEY and NOTIFICATIONS_FROM_EMAIL on the backend — every template below goes live at the same time."
        />
      )}

      {isError ? (
        <NoteCard
          title="Email gallery unavailable"
          message="Couldn't load /v1/admin/email/templates. If the backend hasn't been deployed with this endpoint yet, it will appear once it's live."
        />
      ) : isLoading ? (
        <div className={styles.layout}>
          <Skeleton height={420} radius={16} />
          <Skeleton height={560} radius={16} />
        </div>
      ) : mode === "compose" ? (
        <Composer
          subscribers={status?.subscribers ?? 0}
          sendsEnabled={status?.enabled ?? false}
          initialEmail={initialTo}
        />
      ) : mode === "activity" ? (
        <Activity />
      ) : (
        <div className={styles.layout}>
          {/* Template list */}
          <nav className={styles.list} aria-label="Email templates">
            {groups.map(([group, items]) => (
              <section key={group} className={styles.list__group}>
                <h2 className={styles.list__title}>{group}</h2>
                {items.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={cx(styles.item, t.key === selected && styles["item--active"])}
                    onClick={() => setSelected(t.key)}
                  >
                    <span className={styles.item__label}>{t.label}</span>
                    <span className={styles.item__desc}>{t.description}</span>
                  </button>
                ))}
              </section>
            ))}
          </nav>

          {/* Preview */}
          <section className={styles.preview}>
            <header className={styles.preview__head}>
              <div className={styles.preview__meta}>
                <span className={styles.preview__subjectLabel}>
                  <Mail size={13} /> Subject
                </span>
                <span className={styles.preview__subject}>
                  {render.data?.subject ?? active?.subject ?? "—"}
                </span>
              </div>
              <div className={styles.preview__controls}>
                <SegmentedControl
                  options={VIEW_OPTIONS}
                  value={view}
                  onChange={setView}
                  aria-label="Preview format"
                />
                {view === "html" && (
                  <SegmentedControl
                    options={WIDTH_OPTIONS}
                    value={width}
                    onChange={setWidth}
                    aria-label="Preview width"
                  />
                )}
                <Button
                  variant="secondary"
                  leadingIcon={<Send size={14} />}
                  disabled={!selected || test.isPending || !status?.enabled}
                  title={
                    status?.enabled
                      ? "Deliver this template to your own email address"
                      : "Configure the provider to send tests"
                  }
                  onClick={() => selected && test.mutate(selected)}
                >
                  {test.isPending ? "Sending…" : "Send test to me"}
                </Button>
              </div>
            </header>

            {test.data && (
              <p
                className={cx(
                  styles.testResult,
                  test.data.sent ? styles["testResult--ok"] : styles["testResult--fail"],
                )}
              >
                {test.data.sent ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {test.data.sent ? `Sent to ${test.data.to}.` : test.data.detail}
              </p>
            )}
            {test.isError && (
              <p className={cx(styles.testResult, styles["testResult--fail"])}>
                <XCircle size={14} /> Test send failed — check the audit log.
              </p>
            )}

            {render.isLoading ? (
              <Skeleton height={520} radius={12} />
            ) : render.isError ? (
              <NoteCard title="Preview unavailable" message="Couldn't render this template." />
            ) : view === "html" ? (
              <div className={styles.frameWrap}>
                <iframe
                  className={cx(styles.frame, width === "mobile" && styles["frame--mobile"])}
                  title={`Preview: ${active?.label ?? selected ?? "template"}`}
                  sandbox=""
                  srcDoc={render.data?.html ?? ""}
                />
                {width === "mobile" && (
                  <span className={styles.frameHint}>
                    <MonitorSmartphone size={12} /> 375px viewport
                  </span>
                )}
              </div>
            ) : (
              <pre className={styles.textView}>{render.data?.text ?? ""}</pre>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

/**
 * Compose a one-off email: to every subscriber (announcement, with the
 * unsubscribe footer) or to one specific user (support message, "just
 * reply" style). Plain-text body (blank line = new paragraph), optional CTA
 * button, live preview from the server renderer. "Send test" delivers to
 * your own address; the real send needs a second click to confirm.
 */
function Composer({
  subscribers,
  sendsEnabled,
  initialEmail = "",
}: {
  subscribers: number;
  sendsEnabled: boolean;
  initialEmail?: string;
}) {
  const [audience, setAudience] = useState<Audience>(initialEmail ? "user" : "subscribers");
  const [email, setEmail] = useState(initialEmail);
  const [draft, setDraft] = useState<AnnouncementDraft>({
    subject: "",
    heading: "",
    body: "",
    ctaLabel: "",
    ctaUrl: "",
  });
  const [armed, setArmed] = useState(false);
  const armTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const preview = useAdminAnnouncementPreview();
  const announce = useAdminAnnouncementSend();
  const support = useAdminSupportSend();

  const isSupport = audience === "user";
  const emailOk = /.+@.+\..+/.test(email.trim());
  const ready = Boolean(
    draft.subject.trim() &&
      draft.body.trim() &&
      (isSupport ? emailOk : draft.heading.trim()),
  );
  const busy = announce.isPending || support.isPending;

  // Live preview: re-render on the server, debounced while typing. Support
  // messages preview with the greeting + no unsubscribe footer.
  const previewMutate = preview.mutate;
  useEffect(() => {
    if (!draft.subject.trim() || !draft.body.trim()) return;
    const t = setTimeout(
      () => previewMutate({ draft, kind: isSupport ? "support" : "announcement" }),
      500,
    );
    return () => clearTimeout(t);
  }, [draft, isSupport, previewMutate]);

  const supportDraft = () => ({
    email: email.trim(),
    subject: draft.subject,
    body: draft.body,
    ctaLabel: draft.ctaLabel,
    ctaUrl: draft.ctaUrl,
  });

  const sendTest = () => {
    if (isSupport) support.mutate({ draft: supportDraft(), mode: "test" });
    else announce.mutate({ draft, mode: "test" });
  };

  // The real send arms on first click and fires on the second — enough
  // friction for outbound mail without a modal in the way.
  const onSend = () => {
    if (!armed) {
      setArmed(true);
      clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => setArmed(false), 5000);
      return;
    }
    clearTimeout(armTimer.current);
    setArmed(false);
    if (isSupport) support.mutate({ draft: supportDraft(), mode: "send" });
    else announce.mutate({ draft, mode: "send" });
  };

  const set = (patch: Partial<AnnouncementDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const sendLabel = isSupport
    ? `Send to ${email.trim() || "…"}`
    : `Send to ${subscribers} subscriber${subscribers === 1 ? "" : "s"}`;
  const result = isSupport ? support.data : announce.data;
  const resultOk = isSupport
    ? Boolean(support.data?.sent)
    : (announce.data?.recipients ?? 0) > 0;

  return (
    <div className={styles.composeLayout}>
      <section className={styles.compose}>
        <SegmentedControl
          options={AUDIENCE_OPTIONS}
          value={audience}
          onChange={(a: Audience) => {
            setAudience(a);
            setArmed(false);
          }}
          aria-label="Audience"
        />
        {isSupport && (
          <TextField
            label="To (account email)"
            type="email"
            placeholder="collector@example.com"
            icon={<AtSign />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        <TextField
          label="Subject"
          placeholder={isSupport ? "About your Loupe account" : "A quick update from Loupe"}
          value={draft.subject}
          onChange={(e) => set({ subject: e.target.value })}
          maxLength={150}
        />
        {!isSupport && (
          <TextField
            label="Heading"
            placeholder="Shown as the email's title"
            value={draft.heading}
            onChange={(e) => set({ heading: e.target.value })}
            maxLength={150}
          />
        )}
        <label className={styles.compose__label}>
          Body
          <textarea
            className={styles.compose__body}
            placeholder={
              isSupport
                ? "Write to this user in plain text — the greeting is added automatically, and replies reach the support inbox."
                : "Write in plain text.\n\nA blank line starts a new paragraph."
            }
            value={draft.body}
            onChange={(e) => set({ body: e.target.value })}
            maxLength={5000}
            rows={9}
          />
        </label>
        <div className={styles.compose__ctaRow}>
          <TextField
            label="Button label (optional)"
            placeholder="Open Loupe"
            value={draft.ctaLabel ?? ""}
            onChange={(e) => set({ ctaLabel: e.target.value })}
            maxLength={40}
          />
          <TextField
            label="Button link"
            placeholder="https://loupe.app/…"
            value={draft.ctaUrl ?? ""}
            onChange={(e) => set({ ctaUrl: e.target.value })}
            maxLength={500}
          />
        </div>

        <div className={styles.compose__actions}>
          <Button
            variant="secondary"
            leadingIcon={<Send size={14} />}
            disabled={!ready || !sendsEnabled || busy}
            onClick={sendTest}
          >
            Send test to me
          </Button>
          <Button
            leadingIcon={
              armed ? <CheckCircle2 size={14} /> : isSupport ? <AtSign size={14} /> : <Users size={14} />
            }
            disabled={!ready || !sendsEnabled || busy || (!isSupport && subscribers === 0)}
            onClick={onSend}
          >
            {busy ? "Sending…" : armed ? `Confirm — ${sendLabel}` : sendLabel}
          </Button>
        </div>
        {!sendsEnabled && (
          <p className={styles.compose__note}>
            <Megaphone size={12} /> Preview works now; sending unlocks once the provider is
            configured.
          </p>
        )}
        {result && (
          <p
            className={cx(
              styles.testResult,
              resultOk ? styles["testResult--ok"] : styles["testResult--fail"],
            )}
          >
            {resultOk ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {result.detail}
          </p>
        )}
        {(announce.isError || support.isError) && (
          <p className={cx(styles.testResult, styles["testResult--fail"])}>
            <XCircle size={14} />
            {isSupport
              ? "Send failed — is that a real account email, and the CTA a full URL?"
              : "Send failed — check the CTA link is a full URL."}
          </p>
        )}
      </section>

      <section className={styles.preview}>
        {!draft.subject.trim() || !draft.body.trim() ? (
          <p className={styles.compose__note}>
            {isSupport
              ? "Fill in a subject and body to see the live preview."
              : "Fill in a subject, heading, and body to see the live preview."}
          </p>
        ) : preview.isPending && !preview.data ? (
          <Skeleton height={520} radius={12} />
        ) : preview.data ? (
          <>
            <header className={styles.preview__head}>
              <div className={styles.preview__meta}>
                <span className={styles.preview__subjectLabel}>
                  <Mail size={13} /> Subject
                </span>
                <span className={styles.preview__subject}>{preview.data.subject}</span>
              </div>
            </header>
            <div className={styles.frameWrap}>
              <iframe
                className={styles.frame}
                title="Preview: composed announcement"
                sandbox=""
                srcDoc={preview.data.html}
              />
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

/**
 * Delivery log: every email the app has sent, from queue to
 * delivered/bounced (statuses advance via the Resend webhook). Click a row
 * to see the exact stored render; failed sends can be retried in one click.
 */
function Activity() {
  const [statusFilter, setStatusFilter] = useState<EmailLogStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading, isError, refetch } = useAdminEmailLog({
    status: statusFilter === "all" ? undefined : statusFilter,
    q: debouncedQuery || undefined,
    limit: 50,
  });
  const detail = useAdminEmailLogEntry(selected);
  const retry = useAdminEmailLogRetry();

  const rows = data?.rows ?? [];
  const stats = data?.stats;
  const selectedRow = rows.find((r) => r.id === selected);

  const doRetry = (id: string) => {
    retry.mutate(id, { onSuccess: () => void refetch() });
  };

  return (
    <div className={styles.activityLayout}>
      <section className={styles.activity}>
        {/* Lifetime counts by status — bounced/complained is list damage. */}
        {stats && (
          <div className={styles.activity__stats}>
            {(Object.keys(STATUS_TONE) as EmailLogStatus[]).map((s) => (
              <span key={s} className={styles.activity__stat}>
                <Badge tone={STATUS_TONE[s]}>{s}</Badge>
                <strong>{stats[s] ?? 0}</strong>
              </span>
            ))}
          </div>
        )}

        <div className={styles.activity__filters}>
          <SegmentedControl
            options={STATUS_FILTERS}
            value={statusFilter}
            onChange={setStatusFilter}
            aria-label="Filter by status"
          />
          <input
            className={styles.activity__search}
            type="search"
            placeholder="Search by email or subject…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search the delivery log"
          />
        </div>

        {isError ? (
          <NoteCard
            title="Delivery log unavailable"
            message="Couldn't load /v1/admin/email/log. If the backend hasn't been deployed with this endpoint yet, it will appear once it's live."
          />
        ) : isLoading ? (
          <Skeleton height={320} radius={12} />
        ) : rows.length === 0 ? (
          <p className={styles.compose__note}>
            No emails logged yet — sends start appearing here the moment the
            provider is configured.
          </p>
        ) : (
          <div className={styles.activity__scroller}>
          <table className={styles.activity__table}>
            <thead>
              <tr>
                <th>When</th>
                <th>To</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={cx(r.id === selected && styles["activity__row--active"])}
                  onClick={() => setSelected(r.id === selected ? null : r.id)}
                >
                  <td className={styles.activity__when}>
                    {new Date(r.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className={styles.activity__to}>{r.to}</td>
                  <td className={styles.activity__subject}>{r.subject}</td>
                  <td>{r.category ?? "—"}</td>
                  <td>
                    <span title={r.error ?? undefined}>
                      <Badge tone={STATUS_TONE[r.status]} dot={r.status === "delivered"}>
                        {r.status}
                        {r.attempts > 1 ? ` ×${r.attempts}` : ""}
                      </Badge>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>

      {/* Stored render of the selected send. */}
      {selected && (
        <section className={styles.preview}>
          <header className={styles.preview__head}>
            <div className={styles.preview__meta}>
              <span className={styles.preview__subjectLabel}>
                <Mail size={13} /> {selectedRow?.to}
              </span>
              <span className={styles.preview__subject}>
                {detail.data?.subject ?? selectedRow?.subject ?? ""}
              </span>
              {selectedRow?.error && (
                <span className={cx(styles.testResult, styles["testResult--fail"])}>
                  <XCircle size={14} /> {selectedRow.error}
                </span>
              )}
            </div>
            <div className={styles.preview__controls}>
              {selectedRow && (selectedRow.status === "failed" || selectedRow.status === "queued") && (
                <Button
                  variant="secondary"
                  leadingIcon={<RotateCw size={14} />}
                  disabled={retry.isPending}
                  onClick={() => doRetry(selectedRow.id)}
                >
                  {retry.isPending ? "Retrying…" : "Retry send"}
                </Button>
              )}
            </div>
          </header>
          {retry.data && (
            <p
              className={cx(
                styles.testResult,
                retry.data.sent ? styles["testResult--ok"] : styles["testResult--fail"],
              )}
            >
              {retry.data.sent ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {retry.data.detail}
            </p>
          )}
          {detail.isLoading ? (
            <Skeleton height={420} radius={12} />
          ) : detail.data?.html ? (
            <div className={styles.frameWrap}>
              <iframe
                className={styles.frame}
                title={`Sent email: ${detail.data.subject}`}
                sandbox=""
                srcDoc={detail.data.html}
              />
            </div>
          ) : (
            <p className={styles.compose__note}>No stored render for this send.</p>
          )}
        </section>
      )}
    </div>
  );
}
