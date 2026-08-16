/**
 * trackify API entrypoint (Cloud Run).
 *
 * Boot order is load-bearing:
 *   1. hydrate secrets (fills only MISSING env vars — explicit env wins)
 *   2. validate production config (refuses to boot insecure)
 *   3. build + listen
 * SIGTERM drains the HTTP server then disconnects Prisma, so Cloud Run
 * instance recycling never kills a request mid-write.
 */
import 'dotenv/config';
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { corsOrigins, env, validateProductionConfig } from './config/env';
import { hydrateEnvFromSecretManager } from './config/secretManager';
import { disconnectDb } from './config/db';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRouter } from './routes';

export function buildApp(): Express {
  const app = express();

  // Cloud Run fronts the container with a proxy; without this, req.ip is the
  // proxy and rate limits collapse onto one bucket.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  const allowlist = corsOrigins();
  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header = native app (Capacitor iOS/Android), curl, or a
        // server-to-server webhook — CORS doesn't apply to those.
        if (!origin || allowlist.includes(origin) || env().NODE_ENV !== 'production') {
          callback(null, true);
          return;
        }
        callback(new Error('CORS origin denied'));
      },
      credentials: false,
    }),
  );

  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        // Plaid webhook verification hashes the exact bytes received.
        (req as express.Request).rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/healthz' },
    }),
  );

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true, service: 'trackify-api' });
  });

  app.use('/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

async function main(): Promise<void> {
  await hydrateEnvFromSecretManager();
  validateProductionConfig();

  const app = buildApp();
  const port = env().PORT;
  const server = app.listen(port, () => {
    logger.info({ port, env: env().NODE_ENV }, 'trackify api listening');
  });

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'shutting down');
    server.close(() => {
      void disconnectDb().finally(() => process.exit(0));
    });
    // Belt and suspenders: never hang longer than Cloud Run's grace period.
    setTimeout(() => process.exit(1), 8000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) {
  main().catch((err) => {
    logger.fatal({ err }, 'failed to start');
    process.exit(1);
  });
}
