import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { useTrackApplication, type ApplicationStatus } from "@loupe/core";
import { Button, TextField, NoteCard, Skeleton } from "@/components";
import { SitePage } from "../SitePage/SitePage";
import { STATUS_LABEL, STATUS_TONE } from "../applicationStatus";
import styles from "./ApplicationTrack.module.scss";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

/** Public application tracker — enter the reference + email to see live status. */
export function ApplicationTrack() {
  const [params] = useSearchParams();
  const [id, setId] = useState(params.get("id") ?? "");
  const [email, setEmail] = useState(params.get("email") ?? "");
  // Auto-query when arriving with both prefilled (e.g. from the apply success screen).
  const [submitted, setSubmitted] = useState(Boolean(params.get("id") && params.get("email")));

  const enabled = submitted && Boolean(id) && Boolean(email);
  const { data, isLoading, isError } = useTrackApplication(id.trim(), email.trim(), enabled);

  return (
    <SitePage
      eyebrow="Careers"
      title="Track your application"
      lead="Enter the reference from your confirmation and the email you applied with to see your latest status."
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <TextField label="Application reference" value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. 3f0c…" required />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Button type="submit" leadingIcon={<Search size={16} />} disabled={!id.trim() || !email.trim()}>
          Check status
        </Button>
      </form>

      {enabled && isLoading && <Skeleton height={180} radius={14} />}

      {enabled && isError && (
        <NoteCard
          title="No match found"
          message="We couldn't find an application with that reference and email. Double-check both and try again."
        />
      )}

      {data && (
        <div className={styles.result}>
          <div className={styles.summary}>
            <div>
              <span className={styles.summary__role}>{data.jobTitle}</span>
              <span className={styles.summary__meta}>
                {data.applicantName} · applied {formatDate(data.createdAt)}
              </span>
            </div>
            <span className={styles.badge} data-tone={STATUS_TONE[data.status as ApplicationStatus]}>
              {STATUS_LABEL[data.status as ApplicationStatus]}
            </span>
          </div>

          <ol className={styles.timeline}>
            {[...data.events].reverse().map((ev) => (
              <li key={ev.id} className={styles.event}>
                <span className={styles.event__dot} data-tone={STATUS_TONE[ev.status as ApplicationStatus]} />
                <div className={styles.event__body}>
                  <span className={styles.event__status}>{STATUS_LABEL[ev.status as ApplicationStatus]}</span>
                  {ev.message && <p className={styles.event__message}>{ev.message}</p>}
                  <span className={styles.event__time}>{formatDate(ev.createdAt)}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </SitePage>
  );
}
