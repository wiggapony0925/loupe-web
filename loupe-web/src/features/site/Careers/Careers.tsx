import { useState } from "react";
import { Link } from "react-router-dom";
import { Globe2, HeartPulse, Plane, Search, Sparkles } from "lucide-react";
import { useJobs, type EmploymentType, type JobPosting } from "@loupe/core";
import { Button, Skeleton, NoteCard } from "@/components";
import { SitePage, SiteSection } from "../SitePage/SitePage";
import { ApplyModal } from "../ApplyModal/ApplyModal";
import { CAREERS_EMAIL } from "@/lib/site";
import styles from "./Careers.module.scss";

const PERKS = [
  { icon: Globe2, title: "Remote-first", body: "Work from anywhere. We sync on outcomes, not hours." },
  { icon: HeartPulse, title: "Full health cover", body: "Medical, dental, and vision for you and your family." },
  { icon: Plane, title: "Real time off", body: "Unlimited PTO with a 4-week minimum we actually enforce." },
  { icon: Sparkles, title: "Card stipend", body: "An annual budget to grow the collection you're building tools for." },
];

const TYPE_LABEL: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};

const pitchHref = `mailto:${CAREERS_EMAIL}?subject=${encodeURIComponent("Application: General")}`;

/** Careers — mission, perks, and live open roles with in-app apply. */
export function Careers() {
  const { data: jobs, isLoading, isError } = useJobs();
  const [active, setActive] = useState<JobPosting | null>(null);
  const [open, setOpen] = useState(false);

  const openApply = (job: JobPosting) => {
    setActive(job);
    setOpen(true);
  };

  return (
    <SitePage
      eyebrow="Careers"
      title="Build the tools collectors deserve"
      lead="We're a small, senior, remote-first team turning a passion into a portfolio-grade product. If clean data and craftsmanship excite you, we'd love to talk."
      hero={
        <div className={styles.heroActions}>
          <a href={pitchHref}>
            <Button size="lg">Don't see your role? Pitch us</Button>
          </a>
          <Link to="/careers/track" className={styles.trackLink}>
            <Search size={15} /> Track an application
          </Link>
        </div>
      }
    >
      <SiteSection title="Why Loupe">
        <div className={styles.perks}>
          {PERKS.map(({ icon: Icon, title, body }) => (
            <div key={title} className={styles.perk}>
              <span className={styles.perk__icon}>
                <Icon size={20} />
              </span>
              <h3 className={styles.perk__title}>{title}</h3>
              <p className={styles.perk__body}>{body}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      <SiteSection title={jobs && jobs.length > 0 ? `Open roles · ${jobs.length}` : "Open roles"}>
        {isLoading ? (
          <div className={styles.roles}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={96} radius={14} />
            ))}
          </div>
        ) : isError || !jobs || jobs.length === 0 ? (
          <NoteCard
            title="No open roles right now"
            message="We're not actively hiring at the moment — but we're always glad to hear from exceptional people."
            action={
              <a href={pitchHref}>
                <Button variant="secondary" size="sm">
                  Introduce yourself
                </Button>
              </a>
            }
          />
        ) : (
          <ul className={styles.roles}>
            {jobs.map((role) => (
              <li key={role.id} className={styles.role}>
                <div className={styles.role__main}>
                  <h3 className={styles.role__title}>{role.title}</h3>
                  <p className={styles.role__blurb}>{role.summary}</p>
                  <div className={styles.role__tags}>
                    <span>{role.team}</span>
                    <span>{role.location}</span>
                    <span>{TYPE_LABEL[role.employmentType]}</span>
                  </div>
                </div>
                <Button variant="secondary" className={styles.role__apply} onClick={() => openApply(role)}>
                  Apply
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SiteSection>

      <ApplyModal job={active} open={open} onOpenChange={setOpen} />
    </SitePage>
  );
}
