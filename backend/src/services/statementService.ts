/**
 * PDF statements "made by trackify" — a bank-grade monochrome statement for
 * any account combination and period, optionally archived to GCS with a
 * statements-table record so past statements are re-downloadable.
 *
 * Rendering is pdfkit primitives only (no HTML engine): Helvetica for text,
 * pure black on white, #E0E0E0 hairlines, #FF3B30 reserved for negatives —
 * the Square palette on paper.
 */
import PDFDocument from 'pdfkit';
import { Storage } from '@google-cloud/storage';
import type { StatementFormat, User } from '@prisma/client';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { formatUsd } from '../utils/money';
import { logger } from '../utils/logger';
import type { SheetRow } from './exportService';

const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  offWhite: '#F5F5F5',
  border: '#E0E0E0',
  red: '#FF3B30',
  dim: '#666666',
};

const PAGE = { width: 612, height: 792, margin: 54 }; // US Letter, 3/4" margins

export interface StatementInput {
  user: User;
  rows: SheetRow[];
  periodStart: Date;
  periodEnd: Date;
  scopeLabel: string; // "All accounts", "Business + Personal", "Circle: JFM & Nicol"
}

export async function generateStatementPdf(input: StatementInput): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'LETTER', margin: PAGE.margin, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  drawHeader(doc, input);
  drawSummary(doc, input.rows);
  drawTable(doc, input.rows);
  drawFooters(doc);

  doc.end();
  return finished;
}

function fmtDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function drawHeader(doc: PDFKit.PDFDocument, input: StatementInput): void {
  doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.black).text('trackify', PAGE.margin, PAGE.margin);
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLORS.dim)
    .text('JFM Capital Group LLC', PAGE.margin, PAGE.margin + 4, {
      width: PAGE.width - PAGE.margin * 2,
      align: 'right',
    });

  doc.moveDown(1.5);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.black).text('ACCOUNT STATEMENT');
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLORS.dim)
    .text(`${fmtDate(input.periodStart)} — ${fmtDate(input.periodEnd)}`)
    .text(`Prepared for ${input.user.displayName}`)
    .text(`Scope: ${input.scopeLabel}`);

  const y = doc.y + 10;
  doc.moveTo(PAGE.margin, y).lineTo(PAGE.width - PAGE.margin, y).lineWidth(1).strokeColor(COLORS.black).stroke();
  doc.y = y + 14;
}

function drawSummary(doc: PDFKit.PDFDocument, rows: SheetRow[]): void {
  const charges = rows.filter((r) => r.amountCents > 0).reduce((s, r) => s + r.amountCents, 0);
  const credits = rows.filter((r) => r.amountCents < 0).reduce((s, r) => s + r.amountCents, 0);
  const boxes: Array<{ label: string; value: string; negative?: boolean }> = [
    { label: 'TOTAL CHARGES', value: formatUsd(charges) },
    { label: 'CREDITS', value: formatUsd(credits), negative: credits < 0 },
    { label: 'NET', value: formatUsd(charges + credits) },
    { label: 'TRANSACTIONS', value: String(rows.length) },
  ];

  const gap = 10;
  const boxWidth = (PAGE.width - PAGE.margin * 2 - gap * (boxes.length - 1)) / boxes.length;
  const boxTop = doc.y;
  boxes.forEach((box, i) => {
    const x = PAGE.margin + i * (boxWidth + gap);
    doc.rect(x, boxTop, boxWidth, 52).lineWidth(1).strokeColor(COLORS.border).stroke();
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.dim).text(box.label, x + 10, boxTop + 10);
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(box.negative ? COLORS.red : COLORS.black)
      .text(box.value, x + 10, boxTop + 24, { width: boxWidth - 20 });
  });
  doc.y = boxTop + 52 + 20;
}

const TABLE_COLUMNS: Array<{ label: string; width: number; align: 'left' | 'right' }> = [
  { label: 'DATE', width: 62, align: 'left' },
  { label: 'MERCHANT', width: 168, align: 'left' },
  { label: 'ACCOUNT', width: 116, align: 'left' },
  { label: 'TAG', width: 80, align: 'left' },
  { label: 'AMOUNT', width: 78, align: 'right' },
];

function drawTableHeader(doc: PDFKit.PDFDocument): void {
  const y = doc.y;
  doc.rect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 18).fillColor(COLORS.black).fill();
  let x = PAGE.margin;
  doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.white);
  for (const col of TABLE_COLUMNS) {
    doc.text(col.label, x + 6, y + 5.5, { width: col.width - 12, align: col.align });
    x += col.width;
  }
  doc.y = y + 18;
}

function drawTable(doc: PDFKit.PDFDocument, rows: SheetRow[]): void {
  drawTableHeader(doc);
  const rowHeight = 17;

  rows.forEach((row, index) => {
    if (doc.y + rowHeight > PAGE.height - PAGE.margin - 24) {
      doc.addPage();
      drawTableHeader(doc);
    }
    const y = doc.y;
    if (index % 2 === 1) {
      doc.rect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, rowHeight).fillColor(COLORS.offWhite).fill();
    }

    const tag =
      row.splitType === 'SPLIT'
        ? 'Shared 50/50'
        : row.splitType === 'PARTNER'
          ? row.taggedOwner ?? 'Partner'
          : row.splitType === 'REIMBURSE'
            ? `${row.taggedOwner ?? 'Owed'} (owes)`
            : row.splitType === 'MINE'
              ? 'Mine'
              : row.status === 'REQUIRES_TAGGING'
                ? 'Needs tag'
                : '—';

    const cells = [row.date, row.merchant, row.account, tag, formatUsd(row.amountCents)];
    let x = PAGE.margin;
    TABLE_COLUMNS.forEach((col, i) => {
      const isAmount = i === TABLE_COLUMNS.length - 1;
      doc
        .font(isAmount ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(8)
        .fillColor(isAmount && row.amountCents < 0 ? COLORS.red : COLORS.black)
        .text(cells[i] ?? '', x + 6, y + 4.5, {
          width: col.width - 12,
          align: col.align,
          lineBreak: false,
          ellipsis: true,
        });
      x += col.width;
    });
    doc
      .moveTo(PAGE.margin, y + rowHeight)
      .lineTo(PAGE.width - PAGE.margin, y + rowHeight)
      .lineWidth(0.5)
      .strokeColor(COLORS.border)
      .stroke();
    doc.y = y + rowHeight;
  });
}

function drawFooters(doc: PDFKit.PDFDocument): void {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(COLORS.dim)
      .text(
        `Generated by trackify · JFM Capital Group LLC · Page ${i + 1} of ${range.count}`,
        PAGE.margin,
        PAGE.height - PAGE.margin + 18,
        { width: PAGE.width - PAGE.margin * 2, align: 'center' },
      );
  }
}

// ── Archival ─────────────────────────────────────────────────────────────────

let storage: Storage | null = null;

/**
 * Records the statement and, when a bucket is configured, archives the bytes.
 * Archive failure downgrades to download-only (storagePath NULL) — the user
 * still gets their PDF.
 */
export async function recordStatement(params: {
  user: User;
  circleId?: string | null;
  periodStart: Date;
  periodEnd: Date;
  format: StatementFormat;
  content: Buffer;
  filename: string;
}): Promise<{ statementId: string; storagePath: string | null }> {
  const bucketName = env().GCS_STATEMENTS_BUCKET;
  let storagePath: string | null = null;

  if (bucketName) {
    try {
      storage ??= new Storage();
      const objectPath = `statements/${params.user.id}/${params.filename}`;
      await storage
        .bucket(bucketName)
        .file(objectPath)
        .save(params.content, { contentType: contentTypeFor(params.format) });
      storagePath = `gs://${bucketName}/${objectPath}`;
    } catch (err) {
      logger.warn({ err }, 'statement archival failed — continuing download-only');
    }
  }

  const statement = await prisma.statement.create({
    data: {
      userId: params.user.id,
      circleId: params.circleId ?? null,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      format: params.format,
      storagePath,
    },
  });
  return { statementId: statement.id, storagePath };
}

function contentTypeFor(format: StatementFormat): string {
  switch (format) {
    case 'PDF':
      return 'application/pdf';
    case 'XLSX':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'CSV':
      return 'text/csv';
  }
}
