import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { useAdminJobs, type JobPosting } from "@loupe/core";
import { Button, Skeleton, NoteCard, IconButton } from "@/components";
import { JobForm } from "../JobForm/JobForm";
import styles from "../admin.module.scss";

const TYPE_LABEL: Record<JobPosting["employmentType"], string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};

/** Admin: manage job postings. */
export function AdminJobs() {
  const { data: jobs, isLoading } = useAdminJobs();
  const [editing, setEditing] = useState<JobPosting | null>(null);
  const [open, setOpen] = useState(false);

  const create = () => {
    setEditing(null);
    setOpen(true);
  };
  const edit = (job: JobPosting) => {
    setEditing(job);
    setOpen(true);
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Jobs</h1>
          <p className={styles.subtitle}>Create and manage roles on the careers page.</p>
        </div>
        <Button onClick={create} leadingIcon={<Plus size={16} />}>
          New role
        </Button>
      </div>

      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={68} radius={14} />
          ))}
        </div>
      ) : !jobs || jobs.length === 0 ? (
        <div className={styles.empty}>
          <NoteCard
            title="No roles yet"
            message="Create your first job posting — set it to Open to make it visible on the careers page."
            action={
              <Button variant="secondary" size="sm" onClick={create}>
                New role
              </Button>
            }
          />
        </div>
      ) : (
        <div className={styles.list}>
          {jobs.map((job) => (
            <div key={job.id} className={styles.row}>
              <div className={styles.row__main}>
                <span className={styles.row__title}>{job.title}</span>
                <span className={styles.row__meta}>
                  {job.team} · {job.location} · {TYPE_LABEL[job.employmentType]}
                </span>
              </div>
              <div className={styles.row__actions}>
                <span className={styles.status} data-status={job.status}>
                  {job.status}
                </span>
                <IconButton label={`Edit ${job.title}`} onClick={() => edit(job)}>
                  <Pencil size={16} />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <JobForm job={editing} open={open} onOpenChange={setOpen} />
    </div>
  );
}
