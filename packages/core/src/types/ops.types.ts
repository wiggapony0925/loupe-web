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
