import { useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import {
  useAdminFlags,
  useCreateFlag,
  useUpdateFlag,
  useDeleteFlag,
  type FeatureFlag,
} from "@loupe/core";
import { Button, Skeleton, NoteCard, Modal, TextField, IconButton, useConfirm } from "@/components";
import { notify } from "@/stores/noticeStore";
import styles from "./AdminFlags.module.scss";
import admin from "../admin.module.scss";

/** The Loupe Pro kill switch lives in the normal flag table, but gets its own
 *  prominent control so it's never toggled by accident. */
const SUBSCRIPTIONS_KEY = "subscriptions_enabled";
const SUBSCRIPTIONS_LABEL = "Subscriptions (Loupe Pro)";
const SUBSCRIPTIONS_DESC =
  "Master switch for Loupe Pro. Off = everyone is Pro (no card limit, no paywall) — the safe default for testing. On = free-tier limits and the upgrade paywall are active.";

/** Admin: runtime feature flags — toggle pages/components/micro-apps on web + mobile. */
export function AdminFlags() {
  const { data: flags, isLoading } = useAdminFlags();
  const update = useUpdateFlag();
  const create = useCreateFlag();
  const del = useDeleteFlag();
  const confirm = useConfirm();

  const subsFlag = flags?.find((f) => f.key === SUBSCRIPTIONS_KEY);

  // The kill switch is consequential — confirm before flipping, then toast.
  async function toggleSubscriptions() {
    if (!subsFlag) return;
    const turningOn = !subsFlag.enabled;
    const ok = await confirm({
      title: turningOn ? "Turn subscriptions ON?" : "Turn subscriptions OFF?",
      tone: turningOn ? "mint" : "danger",
      confirmLabel: turningOn ? "Turn on gating" : "Make everything free",
      message: turningOn ? (
        <>
          Free users will be capped at <strong>50 cards</strong> and shown the
          upgrade paywall. Existing Pro members are unaffected.
        </>
      ) : (
        <>
          <strong>Everyone</strong> becomes Pro immediately — no card limit, no
          paywall. Use this if billing misbehaves with real users.
        </>
      ),
    });
    if (!ok) return;
    update.mutate(
      { id: subsFlag.id, input: { enabled: turningOn } },
      {
        onSuccess: () =>
          notify.success(
            turningOn
              ? "Subscriptions are ON — free-tier gating is live."
              : "Subscriptions are OFF — everyone is Pro.",
          ),
        onError: () => notify.error("Couldn't update — please try again."),
      },
    );
  }

  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<FeatureFlag | null>(null);
  const [form, setForm] = useState({ key: "", label: "", description: "", enabled: false });
  const canCreate = form.key.trim() !== "" && form.label.trim() !== "" && !create.isPending;

  // Generic flag toggle — confirm, since flipping a flag changes the app for
  // every user. (The subscriptions kill switch has its own handler above.)
  async function toggleFlag(f: FeatureFlag) {
    const turningOn = !f.enabled;
    const ok = await confirm({
      title: `${turningOn ? "Enable" : "Disable"} “${f.label}”?`,
      tone: turningOn ? "default" : "danger",
      confirmLabel: turningOn ? "Enable" : "Disable",
      message: (
        <>
          This {turningOn ? "shows" : "hides"} <code>{f.key}</code> for{" "}
          <strong>all users</strong> on web and mobile, immediately.
        </>
      ),
    });
    if (!ok) return;
    update.mutate(
      { id: f.id, input: { enabled: turningOn } },
      {
        onSuccess: () => notify.success(`“${f.label}” ${turningOn ? "enabled" : "disabled"}.`),
        onError: () => notify.error("Couldn't update — please try again."),
      },
    );
  }

  const submit = () => {
    if (!canCreate) return;
    create.mutate(
      { key: form.key.trim(), label: form.label.trim(), description: form.description.trim() || null, enabled: form.enabled },
      { onSuccess: () => { setOpen(false); setForm({ key: "", label: "", description: "", enabled: false }); } },
    );
  };

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Feature flags</h1>
          <p className={admin.subtitle}>Hide or reveal pages, components, and micro-apps — on web and mobile, no deploy.</p>
        </div>
        <Button onClick={() => setOpen(true)} leadingIcon={<Plus size={16} />}>
          New flag
        </Button>
      </div>

      {/* ── Loupe Pro kill switch — first-class, hard to fat-finger ── */}
      <div className={styles.killswitch} data-on={subsFlag?.enabled || undefined}>
        <span className={styles.killswitch__icon}>
          <Sparkles size={18} />
        </span>
        <div className={styles.killswitch__text}>
          <span className={styles.killswitch__title}>
            {SUBSCRIPTIONS_LABEL}
            <span className={styles.killswitch__state}>
              {subsFlag?.enabled ? "Live — gating on" : "Off — everything free"}
            </span>
          </span>
          <span className={styles.killswitch__desc}>{SUBSCRIPTIONS_DESC}</span>
        </div>
        {subsFlag ? (
          <button
            type="button"
            role="switch"
            aria-checked={subsFlag.enabled}
            aria-label="Toggle subscriptions"
            className={styles.switch}
            data-on={subsFlag.enabled || undefined}
            disabled={update.isPending}
            onClick={toggleSubscriptions}
          >
            <span className={styles.switch__dot} />
          </button>
        ) : (
          <Button
            size="sm"
            disabled={create.isPending}
            onClick={() =>
              create.mutate({
                key: SUBSCRIPTIONS_KEY,
                label: SUBSCRIPTIONS_LABEL,
                description: SUBSCRIPTIONS_DESC,
                enabled: true,
              })
            }
          >
            {create.isPending ? "Enabling…" : "Enable subscriptions"}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className={admin.list}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={64} radius={14} />
          ))}
        </div>
      ) : !flags || flags.length === 0 ? (
        <NoteCard title="No flags yet" message="Create a flag, then gate UI on it in the apps." />
      ) : (
        <div className={admin.list}>
          {flags
            .filter((f) => f.key !== SUBSCRIPTIONS_KEY)
            .map((f) => (
            <div key={f.id} className={styles.row}>
              <div className={styles.row__main}>
                <span className={styles.row__label}>{f.label}</span>
                <code className={styles.row__key}>{f.key}</code>
                {f.description && <span className={styles.row__desc}>{f.description}</span>}
              </div>
              <div className={styles.row__actions}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={f.enabled}
                  aria-label={`Toggle ${f.label}`}
                  className={styles.switch}
                  data-on={f.enabled || undefined}
                  disabled={update.isPending}
                  onClick={() => toggleFlag(f)}
                >
                  <span className={styles.switch__dot} />
                </button>
                <IconButton label={`Delete ${f.label}`} onClick={() => setRemoving(f)} disabled={del.isPending}>
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create flag */}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="New feature flag"
        description="The key is the stable identifier the apps gate on (e.g. web_markets)."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!canCreate}>
              {create.isPending ? "Creating…" : "Create flag"}
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          <TextField label="Key" placeholder="web_markets" value={form.key} onChange={(e) => setForm((s) => ({ ...s, key: e.target.value }))} />
          <TextField label="Label" placeholder="Markets (web)" value={form.label} onChange={(e) => setForm((s) => ({ ...s, label: e.target.value }))} />
          <TextField label="Description (optional)" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
          <label className={styles.check}>
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((s) => ({ ...s, enabled: e.target.checked }))} />
            Enabled on creation
          </label>
          {create.isError && <p className={styles.error}>Couldn't create — the key may already exist.</p>}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Delete “${removing?.label}”?`}
        description="Apps gating on this key will fall back to their default (shown). This can't be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)} disabled={del.isPending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => removing && del.mutate(removing.id, { onSuccess: () => setRemoving(null) })} disabled={del.isPending}>
              {del.isPending ? "Deleting…" : "Delete flag"}
            </Button>
          </>
        }
      />
    </div>
  );
}
