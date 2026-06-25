/** Maps raw admin Operations payloads (snake_case) onto camelCase view models.
 *  Mirrors app/schemas/ops.py. */
import type {
  AdminCardDetail,
  AdminCardPage,
  AdminCardRow,
  AdminPriceSnapshot,
  AuditEntry,
  AuditPage,
  CatalogCoverage,
  CloudLogEntry,
  CloudService,
  CloudSqlInstance,
  CloudStatus,
  DbColumn,
  DbForeignKey,
  DbGraph,
  DbIndex,
  DbOverview,
  DbTableDetail,
  DbTableSummary,
  GameCoverage,
  HealthCheck,
  HealthReport,
  PulseFeed,
  ScannerStats,
} from "./types";

interface RawHealthCheck {
  key: string;
  label: string;
  status: HealthCheck["status"];
  detail: string;
  category: string;
}
interface RawHealthReport {
  status: HealthReport["status"];
  generated_at: string;
  checks: RawHealthCheck[];
}
export function toHealthReport(r: RawHealthReport): HealthReport {
  return {
    status: r.status,
    generatedAt: r.generated_at,
    checks: r.checks.map((c) => ({ ...c })),
  };
}

interface RawColumn {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
  foreign_key: string | null;
}
interface RawIndex {
  name: string;
  columns: string[];
  unique: boolean;
}
interface RawForeignKey {
  columns: string[];
  references_table: string;
  references_columns: string[];
}
interface RawTableSummary {
  name: string;
  columns: number;
  row_estimate: number;
  foreign_keys: number;
}
interface RawTableDetail {
  name: string;
  row_estimate: number;
  columns: RawColumn[];
  indexes: RawIndex[];
  foreign_keys: RawForeignKey[];
  referenced_by: string[];
}
interface RawOverview {
  dialect: string;
  table_count: number;
  tables: RawTableSummary[];
}
interface RawGraph {
  nodes: Array<{ table: string; columns: number }>;
  edges: Array<{ source: string; target: string; label: string }>;
}

const toColumn = (c: RawColumn): DbColumn => ({
  name: c.name,
  type: c.type,
  nullable: c.nullable,
  primaryKey: c.primary_key,
  foreignKey: c.foreign_key,
});
const toIndex = (i: RawIndex): DbIndex => ({ ...i });
const toForeignKey = (f: RawForeignKey): DbForeignKey => ({
  columns: f.columns,
  referencesTable: f.references_table,
  referencesColumns: f.references_columns,
});
const toTableSummary = (t: RawTableSummary): DbTableSummary => ({
  name: t.name,
  columns: t.columns,
  rowEstimate: t.row_estimate,
  foreignKeys: t.foreign_keys,
});

export function toDbOverview(r: RawOverview): DbOverview {
  return {
    dialect: r.dialect,
    tableCount: r.table_count,
    tables: r.tables.map(toTableSummary),
  };
}
export function toDbTableDetail(r: RawTableDetail): DbTableDetail {
  return {
    name: r.name,
    rowEstimate: r.row_estimate,
    columns: r.columns.map(toColumn),
    indexes: r.indexes.map(toIndex),
    foreignKeys: r.foreign_keys.map(toForeignKey),
    referencedBy: r.referenced_by,
  };
}
export function toDbGraph(r: RawGraph): DbGraph {
  return { nodes: r.nodes.map((n) => ({ ...n })), edges: r.edges.map((e) => ({ ...e })) };
}

interface RawCloudService {
  name: string;
  status: CloudService["status"];
  revision: string | null;
  image: string | null;
  commit_sha: string | null;
  region: string | null;
  url: string | null;
  updated_at: string | null;
}
interface RawCloudSql {
  name: string;
  state: string;
  region: string | null;
}
interface RawCloudStatus {
  configured: boolean;
  project_id: string | null;
  region: string | null;
  detail: string;
  services: RawCloudService[];
  sql_instances: RawCloudSql[];
}
interface RawCloudLog {
  timestamp: string;
  severity: string;
  service: string | null;
  message: string;
}

const toCloudService = (s: RawCloudService): CloudService => ({
  name: s.name,
  status: s.status,
  revision: s.revision,
  image: s.image,
  commitSha: s.commit_sha,
  region: s.region,
  url: s.url,
  updatedAt: s.updated_at,
});
const toCloudSql = (s: RawCloudSql): CloudSqlInstance => ({ ...s });

export function toCloudStatus(r: RawCloudStatus): CloudStatus {
  return {
    configured: r.configured,
    projectId: r.project_id,
    region: r.region,
    detail: r.detail,
    services: r.services.map(toCloudService),
    sqlInstances: r.sql_instances.map(toCloudSql),
  };
}
export function toCloudLogEntry(r: RawCloudLog): CloudLogEntry {
  return { ...r };
}

interface RawAuditEntry {
  id: string;
  user_id: string | null;
  actor_email: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  payload: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}
interface RawAuditPage {
  results: RawAuditEntry[];
  total: number;
  page: number;
  page_size: number;
}
const toAuditEntry = (r: RawAuditEntry): AuditEntry => ({
  id: r.id,
  userId: r.user_id,
  actorEmail: r.actor_email,
  action: r.action,
  targetTable: r.target_table,
  targetId: r.target_id,
  payload: r.payload,
  ipAddress: r.ip_address,
  createdAt: r.created_at,
});
export function toAuditPage(r: RawAuditPage): AuditPage {
  return {
    results: r.results.map(toAuditEntry),
    total: r.total,
    page: r.page,
    pageSize: r.page_size,
  };
}

interface RawGameCoverage {
  tcg: string;
  label: string;
  sets: number;
  cards: number;
  phash_cards: number;
  phash_pct: number;
  backed: boolean;
}
interface RawCatalogCoverage {
  total_cards: number;
  total_sets: number;
  phash_coverage_pct: number;
  price_snapshots: number;
  price_by_source: Record<string, number>;
  games: RawGameCoverage[];
}
const toGameCoverage = (g: RawGameCoverage): GameCoverage => ({
  tcg: g.tcg,
  label: g.label,
  sets: g.sets,
  cards: g.cards,
  phashCards: g.phash_cards,
  phashPct: g.phash_pct,
  backed: g.backed,
});
export function toCatalogCoverage(r: RawCatalogCoverage): CatalogCoverage {
  return {
    totalCards: r.total_cards,
    totalSets: r.total_sets,
    phashCoveragePct: r.phash_coverage_pct,
    priceSnapshots: r.price_snapshots,
    priceBySource: r.price_by_source ?? {},
    games: (r.games ?? []).map(toGameCoverage),
  };
}

interface RawScannerStats {
  window_days: number;
  total_identifications: number;
  by_source: Record<string, number>;
  fast_path_rate: number;
  total_feedback: number;
  correct_feedback: number;
  top1_accuracy: number;
  mean_confidence: number;
  latency_p50_ms: number;
  latency_p95_ms: number;
  total_cost_usd: number;
  by_provider: Record<string, number>;
  by_tcg: Record<string, number>;
  scans_total: number;
  scans_by_status: Record<string, number>;
}
interface RawCardRow {
  id: string;
  name: string;
  set_name: string | null;
  number: string | null;
  tcg: string;
  rarity: string | null;
  year: number | null;
  image_url: string | null;
}
interface RawPriceSnapshot {
  id: string;
  house: string;
  grade: number;
  source: string;
  price_usd: number;
  sale_date: string | null;
  created_at: string;
}
interface RawCardDetail extends RawCardRow {
  set_id: string;
  image_phash: string | null;
  card_metadata: Record<string, unknown> | null;
  external_refs: Array<{ source: string; external_id: string; confidence: number | null }>;
  prices: RawPriceSnapshot[];
}

const toCardRow = (r: RawCardRow): AdminCardRow => ({
  id: r.id,
  name: r.name,
  setName: r.set_name,
  number: r.number,
  tcg: r.tcg,
  rarity: r.rarity,
  year: r.year,
  imageUrl: r.image_url,
});
export const toAdminPriceSnapshot = (p: RawPriceSnapshot): AdminPriceSnapshot => ({
  id: p.id,
  house: p.house,
  grade: p.grade,
  source: p.source,
  priceUsd: p.price_usd,
  saleDate: p.sale_date,
  createdAt: p.created_at,
});
export function toAdminCardPage(r: {
  results: RawCardRow[];
  total: number;
  page: number;
  page_size: number;
}): AdminCardPage {
  return {
    results: (r.results ?? []).map(toCardRow),
    total: r.total,
    page: r.page,
    pageSize: r.page_size,
  };
}
export function toAdminCardDetail(r: RawCardDetail): AdminCardDetail {
  return {
    ...toCardRow(r),
    setId: r.set_id,
    imagePhash: r.image_phash,
    cardMetadata: r.card_metadata,
    externalRefs: (r.external_refs ?? []).map((e) => ({
      source: e.source,
      externalId: e.external_id,
      confidence: e.confidence,
    })),
    prices: (r.prices ?? []).map(toAdminPriceSnapshot),
  };
}

interface RawPulseEvent {
  id: string;
  type: PulseFeed["events"][number]["type"];
  at: string;
  actor: string | null;
  title: string;
  detail: string | null;
  value_usd: number | null;
}
export function toPulseFeed(r: { events: RawPulseEvent[] }): PulseFeed {
  return {
    events: (r.events ?? []).map((e) => ({
      id: e.id,
      type: e.type,
      at: e.at,
      actor: e.actor,
      title: e.title,
      detail: e.detail,
      valueUsd: e.value_usd,
    })),
  };
}

export function toScannerStats(r: RawScannerStats): ScannerStats {
  return {
    windowDays: r.window_days,
    totalIdentifications: r.total_identifications,
    bySource: r.by_source ?? {},
    fastPathRate: r.fast_path_rate,
    totalFeedback: r.total_feedback,
    correctFeedback: r.correct_feedback,
    top1Accuracy: r.top1_accuracy,
    meanConfidence: r.mean_confidence,
    latencyP50Ms: r.latency_p50_ms,
    latencyP95Ms: r.latency_p95_ms,
    totalCostUsd: r.total_cost_usd,
    byProvider: r.by_provider ?? {},
    byTcg: r.by_tcg ?? {},
    scansTotal: r.scans_total,
    scansByStatus: r.scans_by_status ?? {},
  };
}
