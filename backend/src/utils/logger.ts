/**
 * Structured logger (pino).
 *
 * Design rule: nothing secret ever reaches a log line. Cloud Logging retains
 * everything, so redaction happens here — at the sink — not at call sites,
 * where someone will eventually forget.
 */
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  base: { service: 'trackify-api' },
  // Cloud Run's log agent maps `severity`; pino's `level` number is opaque to it.
  formatters: {
    level(label) {
      return { severity: label.toUpperCase(), level: label };
    },
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.accessToken',
      '*.plaidAccessToken',
      '*.access_token',
      '*.public_token',
      '*.token',
      '*.phoneNumber',
      '*.phone_number',
    ],
    censor: '[redacted]',
  },
});
