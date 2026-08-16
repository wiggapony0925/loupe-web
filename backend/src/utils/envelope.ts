/**
 * Universal response envelope — the same contract the loupe services use:
 *
 *   { "data": …, "meta": { … } | null, "error": null }
 *   { "data": null, "meta": null, "error": { "code", "message", "details" } }
 *
 * Clients branch on `error.code` (dot-namespaced, stable) and never on HTTP
 * message text. Every success path goes through ok(); every failure funnels
 * into middleware/errorHandler which emits the error half.
 */
import type { Response } from 'express';

export interface Meta {
  [key: string]: unknown;
}

export function ok<T>(res: Response, data: T, meta: Meta | null = null, status = 200): void {
  res.status(status).json({ data, meta, error: null });
}

export function fail(
  res: Response,
  status: number,
  code: string,
  message: string,
  details: unknown = undefined,
): void {
  res.status(status).json({
    data: null,
    meta: null,
    error: { code, message, ...(details === undefined ? {} : { details }) },
  });
}
