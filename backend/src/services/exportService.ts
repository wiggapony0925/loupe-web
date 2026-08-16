/**
 * The "excel-styled sheet" engine: one row builder feeds the in-app grid, the
 * .xlsx download, the CSV, Google Sheets, and the PDF statement — five views
 * of the SAME query, so exporting can never disagree with what's on screen.
 *
 * Visibility rule (enforced here, not in controllers): a transaction is
 * visible if it sits on one of YOUR accounts, or it was tagged into a circle
 * where you hold VIEW_TRANSACTIONS. That's what lets "my business + personal
 * + Nicol's shared expenses" combine into one sheet without ever exposing a
 * partner's untagged personal spending.
 */
import ExcelJS from 'exceljs';
import type { SplitType, TransactionStatus, User } from '@prisma/client';
import { prisma } from '../config/db';
import { hasPermission } from '../utils/rbac';
import { toCents } from '../utils/money';
import { HttpError } from '../utils/httpError';

const EXPORT_ROW_CAP = 10_000;

export interface SheetFilter {
  accountIds?: string[];
  circleIds?: string[];
  from?: Date;
  to?: Date;
  labelIds?: string[];
  splitTypes?: SplitType[];
  statuses?: TransactionStatus[];
  search?: string;
}

export interface SheetRow {
  id: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  category: string | null;
  account: string;
  institution: string;
  accountOwner: string;
  cardLast4: string | null;
  amountCents: number;
  taggedOwner: string | null;
  splitType: SplitType | null;
  settlementStatus: string;
  status: TransactionStatus;
  source: string;
  circle: string | null;
  labels: string[];
  notes: string | null;
}

export async function viewableCircleIds(userId: string): Promise<string[]> {
  const memberships = await prisma.circleMember.findMany({ where: { userId } });
  return memberships.filter((m) => hasPermission(m, 'VIEW_TRANSACTIONS')).map((m) => m.circleId);
}

export async function buildSheetRows(user: User, filter: SheetFilter): Promise<SheetRow[]> {
  const myAccounts = await prisma.bankAccount.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const myAccountIds = myAccounts.map((a) => a.id);
  const circleIds = await viewableCircleIds(user.id);
  const requestedCircles = filter.circleIds?.length
    ? filter.circleIds.filter((id) => circleIds.includes(id))
    : circleIds;

  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { accountId: { in: myAccountIds } },
        ...(requestedCircles.length > 0 ? [{ circleId: { in: requestedCircles } }] : []),
      ],
      ...(filter.accountIds?.length ? { accountId: { in: filter.accountIds } } : {}),
      ...(filter.from || filter.to
        ? { date: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } }
        : {}),
      ...(filter.splitTypes?.length ? { splitType: { in: filter.splitTypes } } : {}),
      ...(filter.statuses?.length ? { status: { in: filter.statuses } } : {}),
      ...(filter.labelIds?.length
        ? { labels: { some: { labelId: { in: filter.labelIds } } } }
        : {}),
      ...(filter.search
        ? { merchantName: { contains: filter.search, mode: 'insensitive' as const } }
        : {}),
    },
    include: {
      account: {
        select: {
          name: true,
          mask: true,
          institutionName: true,
          user: { select: { displayName: true } },
        },
      },
      taggedOwner: { select: { displayName: true } },
      circle: { select: { name: true } },
      labels: { include: { label: { select: { name: true } } } },
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: EXPORT_ROW_CAP + 1,
  });

  if (transactions.length > EXPORT_ROW_CAP) {
    throw HttpError.badRequest(
      `Export exceeds ${EXPORT_ROW_CAP.toLocaleString()} rows — narrow the date range`,
      'export.too_large',
    );
  }

  return transactions.map((t) => ({
    id: t.id,
    date: t.date.toISOString().slice(0, 10),
    merchant: t.merchantName,
    category: t.category,
    account: `${t.account.name}${t.account.mask ? ` ••${t.account.mask}` : ''}`,
    institution: t.account.institutionName,
    accountOwner: t.account.user.displayName,
    cardLast4: t.cardLast4,
    amountCents: toCents(t.amount),
    taggedOwner: t.taggedOwner?.displayName ?? null,
    splitType: t.splitType,
    settlementStatus: t.settlementStatus,
    status: t.status,
    source: t.source,
    circle: t.circle?.name ?? null,
    labels: t.labels.map((l) => l.label.name),
    notes: t.notes,
  }));
}

// ── XLSX ─────────────────────────────────────────────────────────────────────

const HEADER: Array<{ key: keyof SheetRow | 'amount'; label: string; width: number }> = [
  { key: 'date', label: 'Date', width: 12 },
  { key: 'merchant', label: 'Merchant', width: 32 },
  { key: 'category', label: 'Category', width: 18 },
  { key: 'account', label: 'Account', width: 24 },
  { key: 'institution', label: 'Institution', width: 16 },
  { key: 'accountOwner', label: 'Cardholder', width: 14 },
  { key: 'cardLast4', label: 'Card', width: 8 },
  { key: 'amount', label: 'Amount', width: 14 },
  { key: 'taggedOwner', label: 'Tagged To', width: 14 },
  { key: 'splitType', label: 'Split', width: 12 },
  { key: 'settlementStatus', label: 'Settlement', width: 12 },
  { key: 'status', label: 'Status', width: 16 },
  { key: 'circle', label: 'Circle', width: 16 },
  { key: 'labels', label: 'Labels', width: 20 },
  { key: 'notes', label: 'Notes', width: 28 },
];

/** Square palette, translated to spreadsheet cells. */
const XLSX_COLORS = {
  black: 'FF000000',
  white: 'FFFFFFFF',
  offWhite: 'FFF5F5F5',
  border: 'FFE0E0E0',
  red: 'FFFF3B30',
};

export async function rowsToXlsx(rows: SheetRow[], title: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'trackify — JFM Capital Group LLC';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Transactions', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });
  sheet.columns = HEADER.map((h) => ({ width: h.width }));

  const titleRow = sheet.addRow([title]);
  titleRow.font = { bold: true, size: 14 };
  sheet.mergeCells(1, 1, 1, HEADER.length);

  const headerRow = sheet.addRow(HEADER.map((h) => h.label));
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_COLORS.black } };
    cell.font = { color: { argb: XLSX_COLORS.white }, bold: true };
    cell.border = { bottom: { style: 'thin', color: { argb: XLSX_COLORS.border } } };
  });

  rows.forEach((row, index) => {
    const cells = HEADER.map((h) => {
      if (h.key === 'amount') return row.amountCents / 100;
      if (h.key === 'labels') return row.labels.join(', ');
      return row[h.key as keyof SheetRow] ?? '';
    });
    const added = sheet.addRow(cells);
    if (index % 2 === 1) {
      added.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_COLORS.offWhite } };
      });
    }
    const amountCell = added.getCell(HEADER.findIndex((h) => h.key === 'amount') + 1);
    amountCell.numFmt = `$#,##0.00;[Red]-$#,##0.00`;
  });

  const totalCents = rows.reduce((sum, row) => sum + row.amountCents, 0);
  const totalRow = sheet.addRow([]);
  totalRow.getCell(HEADER.findIndex((h) => h.key === 'merchant') + 1).value = `TOTAL (${rows.length} transactions)`;
  const totalCell = totalRow.getCell(HEADER.findIndex((h) => h.key === 'amount') + 1);
  totalCell.value = totalCents / 100;
  totalCell.numFmt = `$#,##0.00;[Red]-$#,##0.00`;
  totalRow.font = { bold: true };
  totalRow.eachCell((cell) => {
    cell.border = { top: { style: 'thin', color: { argb: XLSX_COLORS.black } } };
  });

  sheet.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: HEADER.length } };

  // Second sheet: rollups people otherwise pivot by hand.
  const summary = workbook.addWorksheet('Summary');
  summary.columns = [{ width: 28 }, { width: 16 }];
  const byCategory = new Map<string, number>();
  const bySplit = new Map<string, number>();
  for (const row of rows) {
    const cat = row.category ?? 'Uncategorized';
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + row.amountCents);
    const split = row.splitType ?? 'UNTAGGED';
    bySplit.set(split, (bySplit.get(split) ?? 0) + row.amountCents);
  }
  const addSection = (name: string, entries: Map<string, number>): void => {
    const head = summary.addRow([name, 'Amount']);
    head.font = { bold: true };
    head.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_COLORS.black } };
      cell.font = { color: { argb: XLSX_COLORS.white }, bold: true };
    });
    [...entries.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([label, cents]) => {
        const r = summary.addRow([label, cents / 100]);
        r.getCell(2).numFmt = `$#,##0.00;[Red]-$#,##0.00`;
      });
    summary.addRow([]);
  };
  addSection('By category', byCategory);
  addSection('By split', bySplit);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ── CSV ──────────────────────────────────────────────────────────────────────

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function rowsToCsv(rows: SheetRow[]): string {
  const lines = [HEADER.map((h) => h.label).join(',')];
  for (const row of rows) {
    lines.push(
      HEADER.map((h) => {
        if (h.key === 'amount') return (row.amountCents / 100).toFixed(2);
        if (h.key === 'labels') return csvEscape(row.labels.join('; '));
        const value = row[h.key as keyof SheetRow];
        return csvEscape(value === null || value === undefined ? '' : String(value));
      }).join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}

export const SHEET_HEADER_LABELS = HEADER.map((h) => h.label);

/** Shared by Google Sheets export — same columns, plain values. */
export function rowsToCellMatrix(rows: SheetRow[]): (string | number)[][] {
  return rows.map((row) =>
    HEADER.map((h) => {
      if (h.key === 'amount') return row.amountCents / 100;
      if (h.key === 'labels') return row.labels.join(', ');
      const value = row[h.key as keyof SheetRow];
      return value === null || value === undefined ? '' : String(value);
    }),
  );
}
