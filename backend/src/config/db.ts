/**
 * Prisma client singleton.
 *
 * Cloud Run can fan out to many instances against one Cloud SQL — keep the
 * per-instance pool small (`connection_limit` in DATABASE_URL, default 5)
 * rather than letting each instance grab the driver default and exhausting
 * `max_connections` on the primary.
 *
 * Cloud SQL connection string (unix socket via the built-in proxy):
 *   postgresql://USER:PASS@localhost/trackify?host=/cloudsql/PROJECT:REGION:INSTANCE&connection_limit=5
 */
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['warn', 'error']
      : ['error'],
});

export async function disconnectDb(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch (err) {
    logger.warn({ err }, 'error during prisma disconnect');
  }
}
