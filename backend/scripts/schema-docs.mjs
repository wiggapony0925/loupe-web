/**
 * schema-docs — the loupe.data pattern: the schema is a documented, diagrammed
 * artifact, generated FROM the source of truth (schema.prisma), never drawn
 * by hand where it can drift. Emits docs/schema.md with Mermaid ER diagrams
 * grouped by domain. Run: npm run db:docs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const schema = readFileSync(join(root, 'src/models/schema.prisma'), 'utf8');

const DOMAINS = {
  'Identity & Circles': ['User', 'Circle', 'CircleMember'],
  'Banking & Positions': ['BankAccount', 'CardMapping', 'Holding'],
  'Ledger': ['Transaction', 'Label', 'TransactionLabel', 'Settlement'],
  'Ingestion & Devices': ['EmailIngestEvent', 'DeviceToken'],
  'Reporting': ['NetWorthSnapshot', 'Statement'],
};

const models = new Map();
for (const match of schema.matchAll(/model (\w+) \{([\s\S]*?)\n\}/g)) {
  const [, name, body] = match;
  const tableMatch = body.match(/@@map\("(\w+)"\)/);
  const fields = [];
  const relations = [];
  for (const line of body.split('\n')) {
    const fieldMatch = line.match(/^\s{2}(\w+)\s+([\w[\]?]+)/);
    if (!fieldMatch || line.trim().startsWith('@@')) continue;
    const [, fieldName, rawType] = fieldMatch;
    const baseType = rawType.replace(/[[\]?]/g, '');
    if (/model (\w+) \{/.test(schema) && schema.includes(`model ${baseType} {`)) {
      if (rawType.endsWith('[]')) relations.push({ to: baseType, label: fieldName });
    } else {
      fields.push({ name: fieldName, type: baseType, optional: rawType.endsWith('?') });
    }
  }
  models.set(name, { table: tableMatch?.[1] ?? name, fields, relations });
}

const snake = (name) => models.get(name)?.table?.toUpperCase() ?? name.toUpperCase();

let out = `# trackify — database schema\n\n> Generated from \`src/models/schema.prisma\` by \`scripts/schema-docs.mjs\`.\n> Do not edit by hand — \`npm run db:docs\` regenerates it.\n\nMoney convention: amounts are \`Decimal\` at rest, integer cents in code, and\n**NULL means unknown, never zero**.\n\n`;

for (const [domain, names] of Object.entries(DOMAINS)) {
  out += `## ${domain}\n\n\`\`\`mermaid\nerDiagram\n`;
  for (const name of names) {
    const model = models.get(name);
    if (!model) continue;
    out += `  ${snake(name)} {\n`;
    for (const field of model.fields.slice(0, 12)) {
      out += `    ${field.type} ${field.name}${field.optional ? ' "nullable"' : ''}\n`;
    }
    out += '  }\n';
  }
  for (const name of names) {
    const model = models.get(name);
    if (!model) continue;
    for (const rel of model.relations) {
      out += `  ${snake(name)} ||--o{ ${snake(rel.to)} : "${rel.label}"\n`;
    }
  }
  out += '```\n\n';
}

out += `## All tables\n\n| Model | Table | Columns | Relations out |\n|---|---|---|---|\n`;
for (const [name, model] of models) {
  out += `| ${name} | \`${model.table}\` | ${model.fields.length} | ${model.relations.map((r) => r.to).join(', ') || '—'} |\n`;
}

mkdirSync(join(root, '../docs'), { recursive: true });
writeFileSync(join(root, '../docs/schema.md'), out);
console.log(`docs/schema.md written (${models.size} models)`);
