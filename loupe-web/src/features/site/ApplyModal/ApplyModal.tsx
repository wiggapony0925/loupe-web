import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Copy } from "lucide-react";
import { useApplyToJob, type JobPosting } from "@loupe/core";
import { Button, Modal, TextField } from "@/components";
import styles from "./ApplyModal.module.scss";

interface ApplyModalProps {
  job: JobPosting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Apply-to-a-role popup. POSTs a real application and, on success, shows the
 *  reference the applicant uses to track their status. */
export function ApplyModal({ job, open, onOpenChange }: ApplyModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [resume, setResume] = useState("");
  const [letter, setLetter] = useState("");
  const [copied, setCopied] = useState(false);

  const apply = useApplyToJob();
  const submitted = apply.data;
  const canSubmit = name.trim() !== "" && email.trim() !== "" && !apply.isPending;

  // Reset everything when the modal (re)opens for a role.
  useEffect(() => {
    if (!open) return;
    setName("");
    setEmail("");
    setLinkedin("");
    setResume("");
    setLetter("");
    setCopied(false);
    apply.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job?.id]);

  const submit = () => {
    if (!job || !canSubmit) return;
    apply.mutate({
      jobId: job.id,
      input: {
        applicantName: name,
        applicantEmail: email,
        linkedinUrl: linkedin || null,
        resumeUrl: resume || null,
        coverLetter: letter || null,
      },
    });
  };

  const copyRef = () => {
    if (!submitted) return;
    void navigator.clipboard?.writeText(submitted.id).then(() => setCopied(true));
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={submitted ? "Application received" : `Apply — ${job?.title ?? ""}`}
      description={
        submitted
          ? "Save your reference below. You can check your status any time on the tracking page."
          : "Tell us about yourself. Fields marked optional can be left blank."
      }
      footer={
        submitted ? (
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Link to={`/careers/track?id=${submitted.id}&email=${encodeURIComponent(email)}`}>
              <Button>Track application</Button>
            </Link>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={apply.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!canSubmit}>
              {apply.isPending ? "Submitting…" : "Submit application"}
            </Button>
          </>
        )
      }
    >
      {submitted ? (
        <div className={styles.success}>
          <CheckCircle2 size={40} className={styles.success__icon} />
          <p className={styles.success__lead}>
            Thanks, {submitted.jobTitle ? `for applying to ${submitted.jobTitle}` : "for applying"}. We'll be in touch.
          </p>
          <div className={styles.refRow}>
            <span className={styles.ref}>{submitted.id}</span>
            <Button variant="secondary" size="sm" onClick={copyRef} leadingIcon={<Copy size={14} />}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.form}>
          <div className={styles.row}>
            <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className={styles.row}>
            <TextField label="LinkedIn (optional)" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://" />
            <TextField label="Resume URL (optional)" value={resume} onChange={(e) => setResume(e.target.value)} placeholder="https://" />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="apply-letter">
              Cover note (optional)
            </label>
            <textarea
              id="apply-letter"
              className={styles.textarea}
              rows={4}
              placeholder="Why you, why Loupe?"
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
            />
          </div>
          {apply.isError && <p className={styles.error}>Couldn't submit right now — please try again.</p>}
        </div>
      )}
    </Modal>
  );
}
