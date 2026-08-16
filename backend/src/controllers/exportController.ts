/**
 * Exports & statements: the combined sheet as .xlsx / .csv download, a
 * "made by trackify" PDF statement, a real Google Sheet shared to the user,
 * and the archive of previously generated statements.
 *
 * File downloads are the one place the JSON envelope doesn't apply — the
 * response IS the file; errors before streaming still go through the
 * envelope error handler.
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/envelope';
import { currentUser } from '../utils/context';
import { buildSheetRows, rowsToCsv, rowsToXlsx } from '../services/exportService';
import { generateStatementPdf, recordStatement } from '../services/statementService';
import { exportRowsToGoogleSheet } from '../services/googleSheetsService';
import { sheetFilterFromQuery, sheetQuerySchema } from './transactionController';

export const exportRouter = Router();

const exportQuery = sheetQuerySchema.extend({
  scope: z.string().max(120).optional(),
});

function periodOf(filter: { from?: Date; to?: Date }): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: filter.from ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: filter.to ?? now,
  };
}

function stamp(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

exportRouter.get(
  '/xlsx',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const query = exportQuery.parse(req.query);
    const filter = sheetFilterFromQuery(query);
    const rows = await buildSheetRows(user, filter);
    const period = periodOf(filter);

    const title = `trackify — ${query.scope ?? 'All accounts'} — ${period.start.toISOString().slice(0, 10)} to ${period.end.toISOString().slice(0, 10)}`;
    const buffer = await rowsToXlsx(rows, title);
    const filename = `trackify-export-${stamp(new Date())}.xlsx`;

    await recordStatement({
      user,
      periodStart: period.start,
      periodEnd: period.end,
      format: 'XLSX',
      content: buffer,
      filename,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }),
);

exportRouter.get(
  '/csv',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const rows = await buildSheetRows(user, sheetFilterFromQuery(exportQuery.parse(req.query)));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="trackify-export-${stamp(new Date())}.csv"`);
    res.send(rowsToCsv(rows));
  }),
);

exportRouter.get(
  '/statement.pdf',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const query = exportQuery.parse(req.query);
    const filter = sheetFilterFromQuery(query);
    const rows = await buildSheetRows(user, filter);
    const period = periodOf(filter);

    const buffer = await generateStatementPdf({
      user,
      rows,
      periodStart: period.start,
      periodEnd: period.end,
      scopeLabel: query.scope ?? 'All accounts',
    });
    const filename = `trackify-statement-${stamp(period.start)}-${stamp(period.end)}.pdf`;

    await recordStatement({
      user,
      circleId: filter.circleIds?.length === 1 ? filter.circleIds[0] : null,
      periodStart: period.start,
      periodEnd: period.end,
      format: 'PDF',
      content: buffer,
      filename,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }),
);

const sheetExportBody = z.object({
  filter: sheetQuerySchema.partial().default({}),
  title: z.string().max(120).optional(),
});

exportRouter.post(
  '/google-sheet',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = sheetExportBody.parse(req.body);
    const rows = await buildSheetRows(user, sheetFilterFromQuery(sheetQuerySchema.parse(body.filter)));
    const result = await exportRowsToGoogleSheet(
      user,
      rows,
      body.title ?? `trackify export ${new Date().toISOString().slice(0, 10)}`,
    );
    ok(res, result, { rowCount: rows.length }, 201);
  }),
);

exportRouter.get(
  '/statements',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const statements = await prisma.statement.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });
    ok(
      res,
      statements.map((s) => ({
        id: s.id,
        periodStart: s.periodStart.toISOString().slice(0, 10),
        periodEnd: s.periodEnd.toISOString().slice(0, 10),
        format: s.format,
        archived: Boolean(s.storagePath),
        createdAt: s.createdAt.toISOString(),
      })),
    );
  }),
);
