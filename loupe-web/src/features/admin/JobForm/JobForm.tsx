import { useEffect, useState } from "react";
import {
  useCreateJob,
  useDeleteJob,
  useUpdateJob,
  type EmploymentType,
  type JobPosting,
  type JobStatus,
} from "@loupe/core";
import { Button, Modal, SegmentedControl, TextField } from "@/components";
import styles from "../admin.module.scss";

const TYPES: { value: EmploymentType; label: string }[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Intern" },
];

const STATUSES: { value: JobStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

interface JobFormProps {
  job: JobPosting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface State {
  title: string;
  team: string;
  location: string;
  employmentType: EmploymentType;
  summary: string;
  description: string;
  status: JobStatus;
}

function initial(job: JobPosting | null): State {
  return {
    title: job?.title ?? "",
    team: job?.team ?? "",
    location: job?.location ?? "",
    employmentType: job?.employmentType ?? "full_time",
    summary: job?.summary ?? "",
    description: job?.description ?? "",
    status: job?.status ?? "draft",
  };
}

/** Create / edit / delete a job posting in one reusable popup. */
export function JobForm({ job, open, onOpenChange }: JobFormProps) {
  const isEdit = Boolean(job);
  const [s, setS] = useState<State>(() => initial(job));
  const [removing, setRemoving] = useState(false);

  const create = useCreateJob({ onSuccess: () => onOpenChange(false) });
  const update = useUpdateJob({ onSuccess: () => onOpenChange(false) });
  const remove = useDeleteJob({ onSuccess: () => onOpenChange(false) });
  const pending = create.isPending || update.isPending || remove.isPending;
  const error = create.isError || update.isError || remove.isError;

  useEffect(() => {
    if (!open) return;
    setS(initial(job));
    setRemoving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job?.id]);

  const set = <K extends keyof State>(k: K, v: State[K]) => setS((p) => ({ ...p, [k]: v }));
  const canSubmit = !pending && s.title.trim() !== "" && s.team.trim() !== "" && s.location.trim() !== "" && s.summary.trim() !== "";

  const submit = () => {
    if (!canSubmit) return;
    const input = { ...s };
    if (isEdit && job) update.mutate({ id: job.id, input });
    else create.mutate(input);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={removing ? "Delete this role?" : isEdit ? "Edit role" : "New role"}
      description={
        removing
          ? "This permanently removes the posting. Existing applications are removed too."
          : "Open roles appear on the public careers page and accept applications."
      }
      footer={
        removing ? (
          <>
            <Button variant="secondary" onClick={() => setRemoving(false)} disabled={pending}>
              Keep it
            </Button>
            <Button variant="danger" onClick={() => job && remove.mutate(job.id)} disabled={pending}>
              {remove.isPending ? "Deleting…" : "Delete role"}
            </Button>
          </>
        ) : (
          <>
            {isEdit && (
              <Button variant="ghost" className={styles.remove} onClick={() => setRemoving(true)} disabled={pending}>
                Delete
              </Button>
            )}
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!canSubmit}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create role"}
            </Button>
          </>
        )
      }
    >
      {!removing && (
        <div className={styles.form}>
          <TextField label="Title" value={s.title} onChange={(e) => set("title", e.target.value)} required />
          <div className={styles.formRow}>
            <TextField label="Team" value={s.team} onChange={(e) => set("team", e.target.value)} required />
            <TextField label="Location" value={s.location} onChange={(e) => set("location", e.target.value)} required />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Employment type</span>
            <SegmentedControl aria-label="Employment type" options={TYPES} value={s.employmentType} onChange={(v) => set("employmentType", v)} />
          </div>
          <TextField label="Summary (one line)" value={s.summary} onChange={(e) => set("summary", e.target.value)} required />
          <div className={styles.field}>
            <label className={styles.label} htmlFor="job-desc">
              Description
            </label>
            <textarea
              id="job-desc"
              className={styles.textarea}
              rows={5}
              value={s.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Full role description…"
            />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Status</span>
            <SegmentedControl aria-label="Status" options={STATUSES} value={s.status} onChange={(v) => set("status", v)} />
          </div>
          {error && <p className={styles.error}>Couldn't save right now — please try again.</p>}
        </div>
      )}
    </Modal>
  );
}
