import { randomUUID } from 'node:crypto';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import { config } from '../config';

/**
 * STRUCTURED LOGGING
 *
 * console.log("user logged in") is fine on a laptop. In production, logs from several servers
 * go to one log service, and you need to SEARCH them: "all errors for request X", "every 5xx
 * from /api/camps in the last hour". So each line is a JSON object with fields
 * (level, time, msg, reqId, statusCode, responseTime...) instead of free text.
 *
 * In development the same JSON is pretty-printed (pino-pretty) so it stays readable.
 */
export const logger = pino({
  level: config.logLevel,
  // Never write secrets to logs: log services are read by many people and kept for months.
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      '*.password',
      '*.newPassword',
      '*.currentPassword',
    ],
    censor: '[redacted]',
  },
  ...(config.nodeEnv === 'development' && {
    transport: { target: 'pino-pretty', options: { singleLine: true, ignore: 'pid,hostname' } },
  }),
});

const REQUEST_ID = /^[\w-]{8,64}$/;

/**
 * One log line per request, with a REQUEST ID. The id is sent back as `X-Request-Id`, so when a
 * user reports "it said Something went wrong", the id in the response finds the exact log lines.
 * A load balancer's id (if it sent one) is reused so the request can be traced across systems.
 */
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && REQUEST_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel: (_req, res, err) =>
    err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
  // Health checks and metric scrapes run every few seconds: logging them is just noise.
  autoLogging: { ignore: (req) => /^\/(api\/health|metrics)/.test(req.url ?? '') },
  serializers: {
    req: (req: { id: string; method: string; url: string }) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
  },
});
