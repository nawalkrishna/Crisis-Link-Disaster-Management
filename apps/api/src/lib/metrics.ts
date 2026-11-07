import type { RequestHandler } from 'express';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import { config } from '../config';
import { prisma } from '../db';
import { HttpError } from './http';

/**
 * METRICS for monitoring (Prometheus format).
 *
 * Logs answer "what happened to THIS request?". Metrics answer "how is the system doing
 * OVERALL?": requests per second, how slow the 95th-percentile request is, how many SMS are
 * stuck in the queue. A monitoring system (Prometheus, Grafana Cloud...) scrapes GET /metrics
 * every few seconds, draws graphs and raises alerts ("error rate > 2% for 5 minutes").
 */
export const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'crisislink_' }); // memory, CPU, event-loop lag

/**
 * A HISTOGRAM counts requests into duration buckets, which lets dashboards compute percentiles.
 * Labels use the ROUTE PATTERN (/api/camps/:id), never the raw URL (/api/camps/0191...):
 * every distinct label value is a new time series, and one per id would overwhelm the database
 * ("high cardinality").
 */
const httpDuration = new Histogram({
  name: 'crisislink_http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const socketConnections = new Gauge({
  name: 'crisislink_socket_connections',
  help: 'Open live-update (Socket.IO) connections on this server',
  registers: [registry],
});

export const smsSent = new Counter({
  name: 'crisislink_sms_total',
  help: 'SMS delivery attempts by result',
  labelNames: ['result'] as const, // sent | retry | failed
  registers: [registry],
});

// Queue depth is read from the database at scrape time (a "collect" callback).
new Gauge({
  name: 'crisislink_sms_outbox',
  help: 'SMS messages by status',
  labelNames: ['status'] as const,
  registers: [registry],
  async collect() {
    const groups = await prisma.smsMessage.groupBy({ by: ['status'], _count: { _all: true } });
    this.reset();
    for (const g of groups) this.set({ status: g.status }, g._count._all);
  },
});

export const metricsMiddleware: RequestHandler = (req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    // req.route is the matched pattern. (req.baseUrl isn't reliable here: Express resets it once
    // the router is done, which can happen before the response finishes.)
    const prefix = req.originalUrl.startsWith('/api/') ? '/api' : '';
    const route = req.route?.path ? `${prefix}${String(req.route.path)}` : 'unmatched';
    end({ method: req.method, route, status: String(res.statusCode) });
  });
  next();
};

/**
 * GET /metrics. Metrics reveal traffic patterns, so in production they're only served with a
 * token (the monitoring system sends it); without METRICS_TOKEN they're off in production.
 */
export const metricsHandler: RequestHandler = async (req, res) => {
  if (config.metricsToken) {
    if (req.get('authorization') !== `Bearer ${config.metricsToken}`) {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Metrics token required');
    }
  } else if (config.isProduction) {
    throw new HttpError(404, 'NOT_FOUND', 'Not found');
  }
  res.set('Content-Type', registry.contentType);
  res.send(await registry.metrics());
};
