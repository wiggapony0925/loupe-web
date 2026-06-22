/** Maps raw backend portal payloads (snake_case) onto the camelCase view
 *  models, and turns input view models into request bodies. Mirrors
 *  app/schemas/portal.py. */
import type {
  AdminMetrics,
  AdminUser,
  AdminUserDetail,
  AdminUserPage,
  FeatureFlag,
  ApplicationEvent,
  ApplicationStatusUpdateInput,
  ApplicationSubmitted,
  ApplicationTrack,
  ApplyInput,
  BlogPost,
  BlogPostInput,
  JobApplication,
  JobApplicationDetail,
  JobPosting,
  JobPostingInput,
  WaitlistEntry,
  WaitlistJoinInput,
  WaitlistJoined,
  WaitlistStats,
} from "./types";

interface RawJob {
  id: string;
  slug: string;
  title: string;
  team: string;
  location: string;
  employment_type: JobPosting["employmentType"];
  summary: string;
  description: string;
  status: JobPosting["status"];
  created_at: string;
  updated_at: string;
}

export function toJobPosting(r: RawJob): JobPosting {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    team: r.team,
    location: r.location,
    employmentType: r.employment_type,
    summary: r.summary,
    description: r.description,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Drop undefined keys so PATCH only sends changed fields. */
export function jobPostingToBody(input: JobPostingInput): Record<string, unknown> {
  const b: Record<string, unknown> = {};
  if (input.title !== undefined) b.title = input.title;
  if (input.team !== undefined) b.team = input.team;
  if (input.location !== undefined) b.location = input.location;
  if (input.employmentType !== undefined) b.employment_type = input.employmentType;
  if (input.summary !== undefined) b.summary = input.summary;
  if (input.description !== undefined) b.description = input.description;
  if (input.status !== undefined) b.status = input.status;
  if (input.slug !== undefined) b.slug = input.slug;
  return b;
}

interface RawEvent {
  id: string;
  status: ApplicationEvent["status"];
  message?: string | null;
  notified: boolean;
  created_at: string;
}

export function toApplicationEvent(r: RawEvent): ApplicationEvent {
  return {
    id: r.id,
    status: r.status,
    message: r.message ?? null,
    notified: Boolean(r.notified),
    createdAt: r.created_at,
  };
}

interface RawApplication {
  id: string;
  job_id: string;
  applicant_name: string;
  applicant_email: string;
  linkedin_url?: string | null;
  resume_url?: string | null;
  cover_letter?: string | null;
  status: JobApplication["status"];
  created_at: string;
  updated_at: string;
  job_title?: string | null;
  events?: RawEvent[];
}

export function toJobApplication(r: RawApplication): JobApplication {
  return {
    id: r.id,
    jobId: r.job_id,
    applicantName: r.applicant_name,
    applicantEmail: r.applicant_email,
    linkedinUrl: r.linkedin_url ?? null,
    resumeUrl: r.resume_url ?? null,
    coverLetter: r.cover_letter ?? null,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    jobTitle: r.job_title ?? null,
  };
}

export function toJobApplicationDetail(r: RawApplication): JobApplicationDetail {
  return { ...toJobApplication(r), events: (r.events ?? []).map(toApplicationEvent) };
}

export function toApplicationSubmitted(r: {
  id: string;
  status: ApplicationSubmitted["status"];
  job_title: string;
  created_at: string;
}): ApplicationSubmitted {
  return { id: r.id, status: r.status, jobTitle: r.job_title, createdAt: r.created_at };
}

export function toApplicationTrack(r: {
  id: string;
  job_title: string;
  applicant_name: string;
  status: ApplicationTrack["status"];
  created_at: string;
  events?: RawEvent[];
}): ApplicationTrack {
  return {
    id: r.id,
    jobTitle: r.job_title,
    applicantName: r.applicant_name,
    status: r.status,
    createdAt: r.created_at,
    events: (r.events ?? []).map(toApplicationEvent),
  };
}

export function applyToBody(input: ApplyInput): Record<string, unknown> {
  return {
    applicant_name: input.applicantName,
    applicant_email: input.applicantEmail,
    linkedin_url: input.linkedinUrl || null,
    resume_url: input.resumeUrl || null,
    cover_letter: input.coverLetter || null,
  };
}

export function statusUpdateToBody(input: ApplicationStatusUpdateInput): Record<string, unknown> {
  return {
    status: input.status,
    message: input.message ?? null,
    notify: input.notify ?? true,
  };
}

interface RawBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tag: string;
  author: string;
  cover_image_url?: string | null;
  read_minutes: number;
  status: BlogPost["status"];
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export function toBlogPost(r: RawBlogPost): BlogPost {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    body: r.body,
    tag: r.tag,
    author: r.author,
    coverImageUrl: r.cover_image_url ?? null,
    readMinutes: r.read_minutes,
    status: r.status,
    publishedAt: r.published_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function blogPostToBody(input: BlogPostInput): Record<string, unknown> {
  const b: Record<string, unknown> = {};
  if (input.title !== undefined) b.title = input.title;
  if (input.excerpt !== undefined) b.excerpt = input.excerpt;
  if (input.body !== undefined) b.body = input.body;
  if (input.tag !== undefined) b.tag = input.tag;
  if (input.author !== undefined) b.author = input.author;
  if (input.coverImageUrl !== undefined) b.cover_image_url = input.coverImageUrl;
  if (input.readMinutes !== undefined) b.read_minutes = input.readMinutes;
  if (input.status !== undefined) b.status = input.status;
  if (input.slug !== undefined) b.slug = input.slug;
  return b;
}

interface RawMetrics {
  users_total: number;
  users_new_7d: number;
  users_new_30d: number;
  admins: number;
  banned: number;
  jobs_total: number;
  jobs_open: number;
  applications_total: number;
  applications_new_7d: number;
  posts_total: number;
  posts_published: number;
  waitlist_total: number;
  waitlist_waiting: number;
}

export function toAdminMetrics(r: RawMetrics): AdminMetrics {
  return {
    usersTotal: r.users_total,
    usersNew7d: r.users_new_7d,
    usersNew30d: r.users_new_30d,
    admins: r.admins,
    banned: r.banned,
    jobsTotal: r.jobs_total,
    jobsOpen: r.jobs_open,
    applicationsTotal: r.applications_total,
    applicationsNew7d: r.applications_new_7d,
    postsTotal: r.posts_total,
    postsPublished: r.posts_published,
    waitlistTotal: r.waitlist_total,
    waitlistWaiting: r.waitlist_waiting,
  };
}

interface RawWaitlistEntry {
  id: string;
  email: string;
  name?: string | null;
  interest?: string | null;
  referral_source?: string | null;
  user_id?: string | null;
  quantity: number;
  status: WaitlistEntry["status"];
  created_at: string;
  updated_at: string;
}

export function toWaitlistEntry(r: RawWaitlistEntry): WaitlistEntry {
  return {
    id: r.id,
    email: r.email,
    name: r.name ?? null,
    interest: r.interest ?? null,
    referralSource: r.referral_source ?? null,
    userId: r.user_id ?? null,
    quantity: r.quantity,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toWaitlistJoined(r: {
  id: string;
  email: string;
  status: WaitlistEntry["status"];
  position: number;
  created_at: string;
}): WaitlistJoined {
  return {
    id: r.id,
    email: r.email,
    status: r.status,
    position: r.position,
    createdAt: r.created_at,
  };
}

export function toWaitlistStats(r: { total: number; waiting: number }): WaitlistStats {
  return { total: r.total, waiting: r.waiting };
}

export function waitlistJoinToBody(input: WaitlistJoinInput): Record<string, unknown> {
  const b: Record<string, unknown> = { email: input.email };
  if (input.name !== undefined) b.name = input.name;
  if (input.interest !== undefined) b.interest = input.interest;
  if (input.referralSource !== undefined) b.referral_source = input.referralSource;
  if (input.quantity !== undefined) b.quantity = input.quantity;
  return b;
}

interface RawAdminUser {
  id: string;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
  created_at: string;
  is_admin: boolean;
  is_super_admin: boolean;
  banned: boolean;
  banned_at?: string | null;
  ban_reason?: string | null;
  deleted: boolean;
  plan?: string;
  pro_expires_at?: string | null;
}

export function toAdminUser(r: RawAdminUser): AdminUser {
  return {
    id: r.id,
    email: r.email,
    displayName: r.display_name ?? null,
    avatarUrl: r.avatar_url ?? null,
    createdAt: r.created_at,
    isAdmin: Boolean(r.is_admin),
    isSuperAdmin: Boolean(r.is_super_admin),
    banned: Boolean(r.banned),
    bannedAt: r.banned_at ?? null,
    banReason: r.ban_reason ?? null,
    deleted: Boolean(r.deleted),
    plan: r.plan ?? "free",
    proExpiresAt: r.pro_expires_at ?? null,
  };
}

export function toAdminUserPage(r: {
  results: RawAdminUser[];
  total: number;
  page: number;
  page_size: number;
}): AdminUserPage {
  return {
    results: (r.results ?? []).map(toAdminUser),
    total: r.total,
    page: r.page,
    pageSize: r.page_size,
  };
}

interface RawAdminUserDetail extends RawAdminUser {
  updated_at?: string | null;
  auth_method: string;
  grades_count: number;
  watchlist_count: number;
  scans_count: number;
  estimated_value_usd: number;
}

export function toAdminUserDetail(r: RawAdminUserDetail): AdminUserDetail {
  return {
    ...toAdminUser(r),
    updatedAt: r.updated_at ?? null,
    authMethod: r.auth_method ?? "unknown",
    gradesCount: r.grades_count ?? 0,
    watchlistCount: r.watchlist_count ?? 0,
    scansCount: r.scans_count ?? 0,
    estimatedValueUsd: Number(r.estimated_value_usd ?? 0),
  };
}

interface RawFlag {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  enabled: boolean;
  updated_at?: string | null;
}

export function toFeatureFlag(r: RawFlag): FeatureFlag {
  return {
    id: r.id,
    key: r.key,
    label: r.label,
    description: r.description ?? null,
    enabled: Boolean(r.enabled),
    updatedAt: r.updated_at ?? null,
  };
}
