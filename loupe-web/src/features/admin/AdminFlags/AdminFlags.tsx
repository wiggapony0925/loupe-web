import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  useAdminFlags,
  useCreateFlag,
  useUpdateFlag,
  useDeleteFlag,
  type FeatureFlag,
} from "@loupe/core";
import { Button, Skeleton, NoteCard, Modal, TextField, IconButton } from "@/components";
import styles from "./AdminFlags.module.scss";
import admin from "../admin.module.scss";

/** Admin: runtime feature flags — toggle pages/components/micro-apps on web + mobile. */
export function AdminFlags() {
  const { data: flags, isLoading } = useAdminFlags();
  const update = useUpdateFlag();
  const create = useCreateFlag();
  const del = useDeleteFlag();

  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<FeatureFlag | null>(null);
  const [form, setForm] = useState({ key: "", label: "", description: "", enabled: false });
  const canCreate = form.key.trim() !== "" && form.label.trim() !== "" && !create.isPending;

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
          {flags.map((f) => (
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
                  onClick={() => update.mutate({ id: f.id, input: { enabled: !f.enabled } })}
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
