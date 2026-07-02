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
  EngagementSummary,
  EnvReport,
  EnvVar,
  GameCoverage,
  Integration,
  IntegrationsReport,
  GradeReviewPage,
  GradeReviewRow,
  HealthCheck,
  HealthReport,
  PulseFeed,
  ScannerStats,
  ScannerTrend,
  ScanHistoryDetail,
  ScanHistoryItem,
  ScanHistoryPage,
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

interface RawEnvVar {
  key: string;
  label: string;
  group: string;
  secret: boolean;
  is_set: boolean;
  value: string | null;
  length: number;
  description: string;
  docs_url: string | null;
}
interface RawEnvReport {
  app_env: string;
  generated_at: string;
  variables: RawEnvVar[];
}
export function toEnvReport(r: RawEnvReport): EnvReport {
  return {
    appEnv: r.app_env,
    generatedAt: r.generated_at,
    variables: r.variables.map(
      (v): EnvVar => ({
        key: v.key,
        label: v.label,
        group: v.group,
        secret: v.secret,
        isSet: v.is_set,
        value: v.value,
        length: v.length,
        description: v.description,
        docsUrl: v.docs_url,
      }),
    ),
  };
}

interface RawIntegration {
  id: string;
  name: string;
  category: string;
  purpose: string;
  configured: boolean;
  capabilities: string[];
  docs_url: string | null;
  status: Integration["status"];
  http_status: number | null;
  latency_ms: number | null;
  detail: string;
}
interface RawIntegrationsReport {
  generated_at: string;
  probed: boolean;
  integrations: RawIntegration[];
}
export function toIntegrationsReport(
  r: RawIntegrationsReport,
): IntegrationsReport {
  return {
    generatedAt: r.generated_at,
    probed: r.probed,
    integrations: r.integrations.map(
      (i): Integration => ({
        id: i.id,
        name: i.name,
        category: i.category,
        purpose: i.purpose,
        configured: i.configured,
        capabilities: i.capabilities ?? [],
        docsUrl: i.docs_url,
        status: i.status,
        httpStatus: i.http_status,
        latencyMs: i.latency_ms,
        detail: i.detail,
      }),
    ),
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
  return {
    nodes: r.nodes.map((n) => ({ ...n })),
    edges: r.edges.map((e) => ({ ...e })),
  };
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
interface RawScannerTrend {
  window_days: number;
  points: {
    date: string;
    count: number;
    mean_confidence: number;
    latency_p50_ms: number;
    latency_p95_ms: number;
    fast_path_rate: number;
  }[];
}
interface RawScanHistoryItem {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  image_url: string | null;
  top_name: string | null;
  top_upstream_id: string | null;
  top_confidence: number;
  primary_source: string;
  candidate_count: number;
  tcg_inferred: string;
  ocr_provider: string;
  parsed_title: string | null;
  parsed_number: string | null;
  latency_ms: number;
  cost_usd: number;
  feedback_correct: boolean | null;
}
interface RawScanHistoryPage {
  items: RawScanHistoryItem[];
  next_cursor: string | null;
  total: number;
}
interface RawScanHistoryDetail extends RawScanHistoryItem {
  ocr_full_text: string | null;
  ocr_confidence: number;
  parsed_set_code: string | null;
  phash: string | null;
  image_sha256: string | null;
  candidates: {
    upstream_id: string | null;
    card_id: string | null;
    name: string;
    confidence: number;
    source: string;
  }[];
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
  external_refs: Array<{
    source: string;
    external_id: string;
    confidence: number | null;
  }>;
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
export const toAdminPriceSnapshot = (
  p: RawPriceSnapshot,
): AdminPriceSnapshot => ({
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

interface RawEngagement {
  total_users: number;
  active_7d: number;
  active_30d: number;
  active_90d: number;
  activated_users: number;
  activation_rate: number;
  pro_users: number;
  pro_rate: number;
  new_users_by_week: Array<{ week: string; new_users: number }>;
  funnel: Array<{ label: string; count: number }>;
}
export function toEngagementSummary(r: RawEngagement): EngagementSummary {
  return {
    totalUsers: r.total_users,
    active7d: r.active_7d,
    active30d: r.active_30d,
    active90d: r.active_90d,
    activatedUsers: r.activated_users,
    activationRate: r.activation_rate,
    proUsers: r.pro_users,
    proRate: r.pro_rate,
    newUsersByWeek: (r.new_users_by_week ?? []).map((w) => ({
      week: w.week,
      newUsers: w.new_users,
    })),
    funnel: (r.funnel ?? []).map((f) => ({ label: f.label, count: f.count })),
  };
}

interface RawGradeRow {
  id: string;
  user_email: string | null;
  card_name: string | null;
  card_image_url: string | null;
  set_name: string | null;
  house: string;
  grade: number;
  subgrades: Record<string, unknown> | null;
  condition: string | null;
  estimated_value_usd: number | null;
  acquired_via: string | null;
  graded_at: string;
}
const toGradeRow = (r: RawGradeRow): GradeReviewRow => ({
  id: r.id,
  userEmail: r.user_email,
  cardName: r.card_name,
  cardImageUrl: r.card_image_url,
  setName: r.set_name,
  house: r.house,
  grade: r.grade,
  subgrades: r.subgrades,
  condition: r.condition,
  estimatedValueUsd: r.estimated_value_usd,
  acquiredVia: r.acquired_via,
  gradedAt: r.graded_at,
});
export function toGradeReviewPage(r: {
  results: RawGradeRow[];
  total: number;
  page: number;
  page_size: number;
  houses: string[];
}): GradeReviewPage {
  return {
    results: (r.results ?? []).map(toGradeRow),
    total: r.total,
    page: r.page,
    pageSize: r.page_size,
    houses: r.houses ?? [],
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

export function toScannerTrend(r: RawScannerTrend): ScannerTrend {
  return {
    windowDays: r.window_days,
    points: (r.points ?? []).map((p) => ({
      date: p.date,
      count: p.count,
      meanConfidence: p.mean_confidence,
      latencyP50Ms: p.latency_p50_ms,
      latencyP95Ms: p.latency_p95_ms,
      fastPathRate: p.fast_path_rate,
    })),
  };
}

function toScanHistoryItem(r: RawScanHistoryItem): ScanHistoryItem {
  return {
    id: r.id,
    createdAt: r.created_at,
    userId: r.user_id,
    userEmail: r.user_email,
    imageUrl: r.image_url,
    topName: r.top_name,
    topUpstreamId: r.top_upstream_id,
    topConfidence: r.top_confidence,
    primarySource: r.primary_source,
    candidateCount: r.candidate_count,
    tcgInferred: r.tcg_inferred,
    ocrProvider: r.ocr_provider,
    parsedTitle: r.parsed_title,
    parsedNumber: r.parsed_number,
    latencyMs: r.latency_ms,
    costUsd: r.cost_usd,
    feedbackCorrect: r.feedback_correct,
  };
}

export function toScanHistoryPage(r: RawScanHistoryPage): ScanHistoryPage {
  return {
    items: (r.items ?? []).map(toScanHistoryItem),
    nextCursor: r.next_cursor,
    total: r.total,
  };
}

export function toScanHistoryDetail(r: RawScanHistoryDetail): ScanHistoryDetail {
  return {
    ...toScanHistoryItem(r),
    ocrFullText: r.ocr_full_text,
    ocrConfidence: r.ocr_confidence,
    parsedSetCode: r.parsed_set_code,
    phash: r.phash,
    imageSha256: r.image_sha256,
    candidates: (r.candidates ?? []).map((c) => ({
      upstreamId: c.upstream_id,
      cardId: c.card_id,
      name: c.name,
      confidence: c.confidence,
      source: c.source,
    })),
  };
}
