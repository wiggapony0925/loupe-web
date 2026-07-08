/** Admin Operations view models — health, database explorer, cloud, audit.
 *  Mirrors app/schemas/ops.py (camelCase here, snake_case on the wire). */

export type HealthStatus = "ok" | "warn" | "down" | "unconfigured";
export type HealthOverall = "ok" | "warn" | "down";

export interface HealthCheck {
  key: string;
  label: string;
  status: HealthStatus;
  detail: string;
  /** "core" | "data" | "infra" | "config". */
  category: string;
}

export interface HealthReport {
  status: HealthOverall;
  generatedAt: string;
  checks: HealthCheck[];
}

// ── Environment manager ──
export interface EnvVar {
  /** The ENV var name, e.g. "STRIPE_SECRET_KEY". */
  key: string;
  label: string;
  group: string;
  /** Secret values are never echoed by the server — `value` stays null. */
  secret: boolean;
  isSet: boolean;
  /** Present only for non-secret config; null for secrets and unset vars. */
  value: string | null;
  /** Character count of the configured value (UI can show "set · 32 chars"). */
  length: number;
  description: string;
  docsUrl: string | null;
}

export interface EnvReport {
  appEnv: string;
  generatedAt: string;
  variables: EnvVar[];
}

// ── Integrations (second-party / external services) ──
export type IntegrationStatus = "live" | "down" | "ready" | "unconfigured";

export interface Integration {
  id: string;
  name: string;
  category: string;
  purpose: string;
  configured: boolean;
  capabilities: string[];
  docsUrl: string | null;
  status: IntegrationStatus;
  /** Populated only after a live probe. */
  httpStatus: number | null;
  latencyMs: number | null;
  detail: string;
}

export interface IntegrationsReport {
  generatedAt: string;
  /** Whether this report ran a live reachability probe. */
  probed: boolean;
  integrations: Integration[];
}

// ── Email (transactional template gallery) ──
export interface EmailTemplateSummary {
  key: string;
  label: string;
  group: string;
  description: string;
  subject: string;
}

export interface EmailStatus {
  enabled: boolean;
  fromEmail: string;
  replyTo: string;
  provider: string;
  /** Active users currently subscribed to announcement email. */
  subscribers: number;
}

export interface AnnouncementDraft {
  subject: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface AnnouncementSendResult {
  mode: "test" | "send";
  recipients: number;
  detail: string;
}

/** One-to-one support message to a specific user. */
export interface SupportDraft {
  email: string;
  subject: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface SupportSendResult {
  sent: boolean;
  to: string;
  detail: string;
}

/** One outbound email in the delivery log. */
export type EmailLogStatus =
  | "queued"
  | "sent"
  | "failed"
  | "delivered"
  | "bounced"
  | "complained";

export interface EmailLogRow {
  id: string;
  createdAt: string;
  to: string;
  userId: string | null;
  category: string | null;
  subject: string;
  status: EmailLogStatus;
  error: string | null;
  attempts: number;
  providerId: string | null;
}

export interface EmailLogDetail extends EmailLogRow {
  html: string | null;
  text: string | null;
  fromEmail: string | null;
}

export interface EmailLogPage {
  rows: EmailLogRow[];
  total: number;
  stats: Record<EmailLogStatus, number>;
}

export interface EmailLogParams {
  status?: EmailLogStatus;
  category?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface EmailTemplatesReport {
  status: EmailStatus;
  templates: EmailTemplateSummary[];
}

export interface EmailTemplateRender {
  key: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailTestResult {
  sent: boolean;
  to: string;
  detail: string;
}

// ── Database explorer ──
export interface DbColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  /** "table.column" when this column is a foreign key. */
  foreignKey: string | null;
}

export interface DbIndex {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface DbForeignKey {
  columns: string[];
  referencesTable: string;
  referencesColumns: string[];
}

export interface DbTableSummary {
  name: string;
  columns: number;
  rowEstimate: number;
  foreignKeys: number;
}

export interface DbTableDetail {
  name: string;
  rowEstimate: number;
  columns: DbColumn[];
  indexes: DbIndex[];
  foreignKeys: DbForeignKey[];
  referencedBy: string[];
}

export interface DbOverview {
  dialect: string;
  tableCount: number;
  tables: DbTableSummary[];
}

export interface DbGraphNode {
  table: string;
  columns: number;
}

export interface DbGraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface DbGraph {
  nodes: DbGraphNode[];
  edges: DbGraphEdge[];
}

// ── Google Cloud ──
export type CloudServiceStatus = "ready" | "deploying" | "error" | "unknown";

export interface CloudService {
  name: string;
  status: CloudServiceStatus;
  revision: string | null;
  image: string | null;
  commitSha: string | null;
  region: string | null;
  url: string | null;
  updatedAt: string | null;
}

export interface CloudSqlInstance {
  name: string;
  state: string;
  region: string | null;
}

export interface CloudLogEntry {
  timestamp: string;
  severity: string;
  service: string | null;
  message: string;
}

export interface CloudStatus {
  configured: boolean;
  projectId: string | null;
  region: string | null;
  detail: string;
  services: CloudService[];
  sqlInstances: CloudSqlInstance[];
}

// ── Audit log ──
export interface AuditEntry {
  id: string;
  userId: string | null;
  actorEmail: string | null;
  action: string;
  targetTable: string | null;
  targetId: string | null;
  payload: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditPage {
  results: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditFacets {
  actions: string[];
  tables: string[];
}

export interface AuditParams {
  action?: string;
  targetTable?: string;
  actor?: string;
  page?: number;
  pageSize?: number;
}

// ── PriceCharting tier & fallback ────────────────────────────────────────────

export type PriceChartingTier = "legendary" | "premium" | "collector" | "none";

export interface PriceChartingCapabilities {
  configured: boolean;
  apiOk: boolean;
  gradedFields: boolean;
  csvOk: boolean;
  probedAt: string | null;
  note: string;
  tier: PriceChartingTier;
}

export interface PriceChartingStrategy {
  key: string;
  label: string;
  description: string;
}

export interface PriceChartingRung {
  tier: PriceChartingTier;
  label: string;
  requirement: string;
  strategy: PriceChartingStrategy;
  active: boolean;
}

export interface PriceChartingMirror {
  ready: boolean;
  rows: number;
  syncedAt: string | null;
}

export interface PriceChartingGradeMapEntry {
  field: string;
  grade: string;
}

/** The dev-portal "PriceCharting tier & fallback" view. */
export interface PriceChartingOverview {
  configured: boolean;
  capabilities: PriceChartingCapabilities;
  tier: { key: PriceChartingTier; label: string };
  strategy: PriceChartingStrategy;
  fallbackChain: PriceChartingRung[];
  gradeMap: PriceChartingGradeMapEntry[];
  mirror: PriceChartingMirror;
}

/** Result of a Legendary bulk CSV sync. */
export interface PriceChartingSyncResult {
  ok: boolean;
  rows: number;
  reason?: string;
}
