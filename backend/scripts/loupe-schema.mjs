/**
 * Prisma → loupe.data bridge. Emits trackify's schema in the exact
 * schema.json format loupe.data compiles in (its SchemaMap, TableBrowser,
 * QueryPane whitelist and Insights all read it), so the SAME explorer tool
 * works on trackify's Postgres with zero changes to loupe.data:
 *
 *   npm run db:loupe                       # writes docs/loupe-schema.json
 *   cp docs/loupe-schema.json ../loupe.data/src/schema.json
 *   DATABASE_URL=postgres://… node ../loupe.data/server.mjs   (+ vite dev)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const schema = readFileSync(join(root, 'src/models/schema.prisma'), 'utf8');

const DOMAIN_OF = {
  User: 'Identity', Circle: 'Identity', CircleMember: 'Identity',
  BankAccount: 'Banking', CardMapping: 'Banking', Holding: 'Banking',
  Transaction: 'Ledger', Label: 'Ledger', TransactionLabel: 'Ledger', Settlement: 'Ledger',
  EmailIngestEvent: 'Ingestion', DeviceToken: 'Ingestion',
  NetWorthSnapshot: 'Reporting', Statement: 'Reporting',
};

const enums = new Set([...schema.matchAll(/enum (\w+) \{/g)].map((m) => m[1]));
const modelBodies = new Map(
  [...schema.matchAll(/model (\w+) \{([\s\S]*?)\n\}/g)].map((m) => [m[1], m[2]]),
);
const tableOf = (model) =>
  modelBodies.get(model)?.match(/@@map\("(\w+)"\)/)?.[1] ?? model;

function pgType(base, attrs) {
  const db = attrs.match(/@db\.(\w+)(\(([\d, ]+)\))?/);
  if (db) {
    const t = db[1].toUpperCase();
    return db[3] ? `${t === 'DECIMAL' ? 'NUMERIC' : t}(${db[3].replace(/\s/g, '')})` : t;
  }
  if (enums.has(base)) return `ENUM(${base})`;
  return { String: 'TEXT', Int: 'INTEGER', Boolean: 'BOOLEAN', DateTime: 'TIMESTAMP', Decimal: 'NUMERIC', Json: 'JSONB', Float: 'DOUBLE' }[base] ?? base.toUpperCase();
}

const tables = [];
for (const [model, body] of modelBodies) {
  const columnMeta = new Map(); // prisma field name -> column info
  const fkOf = new Map(); // prisma scalar field -> "table.column"

  for (const line of body.split('\n')) {
    const m = line.match(/^\s{2}(\w+)\s+([\w[\]?]+)(.*)$/);
    if (!m) continue;
    const [, field, rawType, attrs] = m;
    const base = rawType.replace(/[[\]?]/g, '');
    if (modelBodies.has(base)) {
      const rel = attrs.match(/fields:\s*\[(\w+)\][^\]]*references:\s*\[(\w+)\]/);
      if (rel) {
        const refCol = modelBodies.get(base)?.match(new RegExp(`^\\s{2}${rel[2]}\\s+\\S+.*?@map\\("(\\w+)"\\)`, 'm'))?.[1] ?? rel[2];
        fkOf.set(rel[1], `${tableOf(base)}.${refCol}`);
      }
      continue;
    }
    const colName = attrs.match(/@map\("(\w+)"\)/)?.[1] ?? field;
    columnMeta.set(field, {
      name: colName,
      type: pgType(base, attrs),
      nullable: rawType.endsWith('?'),
      pk: /@id\b/.test(attrs),
      fk: null,
      default: attrs.match(/@default\((.+?)\)/)?.[1] ?? null,
    });
  }
  // Composite @@id([a, b])
  const compound = body.match(/@@id\(\[([^\]]+)\]\)/);
  if (compound) {
    for (const f of compound[1].split(',').map((s) => s.trim())) {
      const col = columnMeta.get(f);
      if (col) col.pk = true;
    }
  }
  for (const [field, target] of fkOf) {
    const col = columnMeta.get(field);
    if (col) col.fk = target;
  }
  tables.push({
    name: tableOf(model),
    domain: DOMAIN_OF[model] ?? 'Platform',
    columns: [...columnMeta.values()],
  });
}

mkdirSync(join(root, '../docs'), { recursive: true });
const out = JSON.stringify({ meta: { name: 'trackify', generator: 'prisma' }, tables, stats: { tables: tables.length, columns: tables.reduce((n, t) => n + t.columns.length, 0) } }, null, 1);
writeFileSync(join(root, '../docs/loupe-schema.json'), out);
console.log(`docs/loupe-schema.json: ${tables.length} tables, ${tables.reduce((n, t) => n + t.columns.length, 0)} columns`);
