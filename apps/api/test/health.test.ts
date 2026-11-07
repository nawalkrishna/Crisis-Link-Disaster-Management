import { describe, expect, it } from 'vitest';
import { client } from './helpers';

describe('health and monitoring', () => {
  const api = client();

  it('reports the API and database as up', async () => {
    const res = await api.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up', service: 'crisislink-api' });
  });

  it('has a liveness probe that does not need the database', async () => {
    const res = await api.get('/api/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('gives every response a request id, reusing a valid incoming one', async () => {
    const fresh = await api.get('/api/health/live');
    expect(fresh.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);

    const traced = await api.get('/api/health/live').set('X-Request-Id', 'lb-trace-12345');
    expect(traced.headers['x-request-id']).toBe('lb-trace-12345');

    const bogus = await api.get('/api/health/live').set('X-Request-Id', '<script>');
    expect(bogus.headers['x-request-id']).not.toBe('<script>');
  });

  it('exposes Prometheus metrics with route patterns, not raw URLs', async () => {
    await api.get('/api/camps/00000000-0000-0000-0000-000000000000');
    const res = await api.get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('crisislink_http_request_duration_seconds');
    expect(res.text).toContain('route="/api/camps/:id"');
    expect(res.text).not.toContain('00000000-0000');
  });

  it('returns JSON errors for unknown routes and bad JSON', async () => {
    const missing = await api.get('/api/nope');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');

    const badJson = await api
      .post('/api/incidents')
      .set('content-type', 'application/json')
      .send('{"oops"');
    expect(badJson.status).toBe(400);
    expect(badJson.body.error.code).toBe('BAD_JSON');
  });

  it('sets security headers', async () => {
    const res = await api.get('/api/health/live');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
