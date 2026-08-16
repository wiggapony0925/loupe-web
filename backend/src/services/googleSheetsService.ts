/**
 * "Export to Google Sheets": creates a real spreadsheet in Drive (service
 * account via ADC), writes the same rows the in-app sheet shows, applies the
 * monochrome header, and shares it to the user's email as an editor.
 *
 * Needs the Sheets + Drive APIs enabled on the project and (for sharing) a
 * user email on file. Both failure modes surface as typed errors the client
 * can explain, not opaque 500s.
 */
import { google } from 'googleapis';
import type { User } from '@prisma/client';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';
import { rowsToCellMatrix, SHEET_HEADER_LABELS, type SheetRow } from './exportService';

export async function exportRowsToGoogleSheet(
  user: User,
  rows: SheetRow[],
  title: string,
): Promise<{ spreadsheetId: string; url: string; sharedWith: string | null }> {
  const auth = new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  let spreadsheetId: string;
  try {
    const created = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: [{ properties: { title: 'Transactions', gridProperties: { frozenRowCount: 1 } } }],
      },
    });
    spreadsheetId = created.data.spreadsheetId ?? '';
    if (!spreadsheetId) throw new Error('no spreadsheetId returned');
  } catch (err) {
    logger.error({ err }, 'google sheets create failed');
    throw new HttpError(
      502,
      'export.sheets_failed',
      'Could not create the Google Sheet — check that the Sheets/Drive APIs are enabled for the service account',
    );
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Transactions!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [SHEET_HEADER_LABELS, ...rowsToCellMatrix(rows)] },
  });

  const amountColumn = SHEET_HEADER_LABELS.indexOf('Amount');
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0, green: 0, blue: 0 },
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 1,
              startColumnIndex: amountColumn,
              endColumnIndex: amountColumn + 1,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: { type: 'CURRENCY', pattern: '$#,##0.00;[Red]-$#,##0.00' },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId: 0,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: SHEET_HEADER_LABELS.length,
            },
          },
        },
      ],
    },
  });

  let sharedWith: string | null = null;
  if (user.email) {
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        sendNotificationEmail: true,
        requestBody: { type: 'user', role: 'writer', emailAddress: user.email },
      });
      sharedWith = user.email;
    } catch (err) {
      // The sheet exists and is returned either way; sharing is best-effort.
      logger.warn({ err, email: user.email }, 'sheet share failed');
    }
  }

  return {
    spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    sharedWith,
  };
}
