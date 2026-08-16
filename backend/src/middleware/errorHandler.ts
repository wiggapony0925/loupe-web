/**
 * Central error funnel. Everything thrown anywhere becomes the envelope's
 * error half with a stable dot-namespaced code; unexpected errors are logged
 * with a stack but leave the process with a generic 500 — internals never
 * leak to clients.
 */
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { HttpError } from '../utils/httpError';
import { fail } from '../utils/envelope';
import { logger } from '../utils/logger';

export const notFoundHandler: RequestHandler = (req, res) => {
  fail(res, 404, 'route.not_found', `No route for ${req.method} ${req.path}`);
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (res.headersSent) return;

  if (err instanceof HttpError) {
    if (err.status >= 500) logger.error({ err, path: req.path }, err.message);
    fail(res, err.status, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    fail(res, 422, 'validation.failed', 'Request failed validation', err.flatten());
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      fail(res, 409, 'resource.conflict', 'A record with those unique values already exists');
      return;
    }
    if (err.code === 'P2025') {
      fail(res, 404, 'resource.not_found', 'Record not found');
      return;
    }
  }

  logger.error({ err, path: req.path, method: req.method }, 'unhandled error');
  fail(res, 500, 'internal.error', 'Something went wrong');
};
