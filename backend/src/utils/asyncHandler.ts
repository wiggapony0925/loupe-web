/**
 * Express 4 does not catch rejected promises from async handlers — an
 * unhandled rejection there kills the process on Node 15+. Every async
 * handler in this codebase is wrapped, so a thrown HttpError always lands
 * in the central errorHandler instead.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
