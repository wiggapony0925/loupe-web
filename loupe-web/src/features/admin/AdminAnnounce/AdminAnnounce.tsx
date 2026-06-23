import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Megaphone, Save, Send, X } from "lucide-react";
import {
  useAdminSiteConfig,
  useUpdateAnnouncement,
  type AnnouncementTone,
} from "@loupe/core";
import { Button, Skeleton, TextField, SegmentedControl } from "@/components";
import { notify } from "@/stores/noticeStore";
import styles from "./AdminAnnounce.module.scss";
import admin from "../admin.module.scss";

const TONES: AnnouncementTone[] = ["info", "success", "warning", "error"];
const TONE_ICON: Record<AnnouncementTone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertTriangle,
};

/** Admin: broadcast a banner notification to every user (web + mobile). Mirrors
 *  the real global <Banner> in a live preview so there are no surprises. */
export function AdminAnnounce() {
  const { data, isLoading } = useAdminSiteConfig();
  const update = useUpdateAnnouncement();

  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<AnnouncementTone>("info");

  useEffect(() => {
    if (!data) return;
    setEnabled(data.announcement.enabled);
    setMessage(data.announcement.message);
    setTone(data.announcement.tone);
  }, [data]);

  const live = Boolean(data?.announcement.enabled && data?.announcement.message.trim());

  function publish() {
    update.mutate(
      { enabled, message: message.trim(), tone },
      {
        onSuccess: () =>
          notify.success(
            enabled ? "Announcement is live for all users." : "Saved (hidden for now).",
          ),
        onError: () => notify.error("Couldn't save — please try again."),
      },
    );
  }

  function takeDown() {
    setEnabled(false);
    update.mutate(
      { enabled: false },
      {
        onSuccess: () => notify.success("Announcement taken down."),
        onError: () => notify.error("Couldn't update — please try again."),
      },
    );
  }

  if (isLoading || !data) {
    return (
      <div className={admin.page}>
        <Skeleton height={320} radius={14} />
      </div>
    );
  }

  const Icon = TONE_ICON[tone];
  const previewText = message.trim() || "Your message will appear here…";

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Announcements</h1>
          <p className={admin.subtitle}>
            Broadcast a banner to every user — web and mobile, live, no deploy.
          </p>
        </div>
        {live && <span className={styles.liveBadge}>● Live now</span>}
      </div>

      {/* ── Live preview — the exact global <Banner> users see ── */}
      <div className={styles.previewWrap}>
        <span className={styles.previewLabel}>Preview — what users see</span>
        <div className={styles.banner} data-tone={tone}>
          <Icon size={18} className={styles.bannerIcon} />
          <span className={styles.bannerMsg}>{previewText}</span>
          <X size={16} className={styles.bannerClose} aria-hidden />
        </div>
      </div>

      {/* ── Composer ── */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          <Megaphone size={18} /> Compose
        </h2>
        <TextField
          label="Message"
          placeholder="e.g. New: sealed product tracking is live 🎉"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className={styles.toneRow}>
          <span className={styles.toneLabel}>Tone</span>
          <SegmentedControl<AnnouncementTone>
            aria-label="Announcement tone"
            value={tone}
            onChange={setTone}
            options={TONES.map((t) => ({
              value: t,
              label: t.charAt(0).toUpperCase() + t.slice(1),
            }))}
          />
        </div>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Show to all users now
        </label>
        <div className={styles.actions}>
          <Button
            leadingIcon={enabled ? <Send size={16} /> : <Save size={16} />}
            disabled={update.isPending || (enabled && !message.trim())}
            onClick={publish}
          >
            {enabled ? "Publish to everyone" : "Save draft"}
          </Button>
          {live && (
            <Button variant="secondary" onClick={takeDown} disabled={update.isPending}>
              Take down
            </Button>
          )}
        </div>
        <p className={styles.hint}>
          Banners are dismissible. A user who dismisses one only sees it again
          if you change the message.
        </p>
      </section>
    </div>
  );
}
