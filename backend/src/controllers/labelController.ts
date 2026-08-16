/**
 * Labels: user-defined tags ("Business", "Vacation 2026", "Tax deductible")
 * attachable to any visible transaction and usable as sheet/export filters.
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/envelope';
import { HttpError } from '../utils/httpError';
import { currentUser, requiredParam } from '../utils/context';

export const labelRouter = Router();

const labelBody = z.object({ name: z.string().min(1).max(40) });

labelRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const labels = await prisma.label.findMany({
      where: { createdById: user.id },
      include: { _count: { select: { transactions: true } } },
      orderBy: { name: 'asc' },
    });
    ok(
      res,
      labels.map((l) => ({
        id: l.id,
        name: l.name,
        transactionCount: l._count.transactions,
        createdAt: l.createdAt.toISOString(),
      })),
    );
  }),
);

labelRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { name } = labelBody.parse(req.body);
    const label = await prisma.label.create({ data: { createdById: user.id, name } });
    ok(res, { id: label.id, name: label.name, transactionCount: 0 }, null, 201);
  }),
);

labelRouter.patch(
  '/:labelId',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { name } = labelBody.parse(req.body);
    const labelId = requiredParam(req, 'labelId');

    const label = await prisma.label.findFirst({ where: { id: labelId, createdById: user.id } });
    if (!label) throw HttpError.notFound('Label');

    const updated = await prisma.label.update({ where: { id: labelId }, data: { name } });
    ok(res, { id: updated.id, name: updated.name });
  }),
);

labelRouter.delete(
  '/:labelId',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const labelId = requiredParam(req, 'labelId');
    const label = await prisma.label.findFirst({ where: { id: labelId, createdById: user.id } });
    if (!label) throw HttpError.notFound('Label');
    await prisma.label.delete({ where: { id: labelId } });
    ok(res, { deleted: true });
  }),
);
