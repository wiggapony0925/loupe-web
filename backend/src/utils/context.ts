/**
 * Request-context accessors that narrow the optional augmentations set by
 * middleware — a route that forgot its guard fails loudly here instead of
 * dereferencing undefined three layers down.
 */
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { HttpError } from './httpError';

export function currentUser(req: Request): User {
  if (!req.user) throw HttpError.unauthorized('requireAuth must guard this route');
  return req.user;
}

export function requiredParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw HttpError.badRequest(`Missing route param ${name}`);
  return value;
}
