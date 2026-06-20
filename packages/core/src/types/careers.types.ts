/** Developer portal: job postings + applications. */

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "internship";

export type JobStatus = "draft" | "open" | "closed";

export type ApplicationStatus =
  | "submitted"
  | "reviewing"
  | "interview"
  | "offer"
  | "hired"
  | "rejected"
  | "withdrawn";

/** A job posting. `status` drives public visibility (`open` only). */
export interface JobPosting {
  id: string;
  slug: string;
  title: string;
  team: string;
  location: string;
  employmentType: EmploymentType;
  summary: string;
  description: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

/** Create/update body for a job posting (all optional on update). */
export interface JobPostingInput {
  title?: string;
  team?: string;
  location?: string;
  employmentType?: EmploymentType;
  summary?: string;
  description?: string;
  status?: JobStatus;
  slug?: string;
}

/** One entry in an application's status/communication trail. */
export interface ApplicationEvent {
  id: string;
  status: ApplicationStatus;
  message?: string | null;
  notified: boolean;
  createdAt: string;
}

/** An application row (admin list/detail). */
export interface JobApplication {
  id: string;
  jobId: string;
  applicantName: string;
  applicantEmail: string;
  linkedinUrl?: string | null;
  resumeUrl?: string | null;
  coverLetter?: string | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  jobTitle?: string | null;
}

export interface JobApplicationDetail extends JobApplication {
  events: ApplicationEvent[];
}

/** Public response after applying — the reference the applicant tracks with. */
export interface ApplicationSubmitted {
  id: string;
  status: ApplicationStatus;
  jobTitle: string;
  createdAt: string;
}

/** An applicant's own view of their application + updates. */
export interface ApplicationTrack {
  id: string;
  jobTitle: string;
  applicantName: string;
  status: ApplicationStatus;
  createdAt: string;
  events: ApplicationEvent[];
}

/** Public application submission body. */
export interface ApplyInput {
  applicantName: string;
  applicantEmail: string;
  linkedinUrl?: string | null;
  resumeUrl?: string | null;
  coverLetter?: string | null;
}

/** Admin: advance an application and optionally notify the applicant. */
export interface ApplicationStatusUpdateInput {
  status: ApplicationStatus;
  message?: string | null;
  notify?: boolean;
}
