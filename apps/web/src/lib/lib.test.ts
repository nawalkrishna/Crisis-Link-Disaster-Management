import { describe, expect, it } from 'vitest';
import type { Query } from '@tanstack/react-query';
import { campColor, toPoint } from '../components/map/map-style';
import { humanize, pluralize, timeAgo } from './format';
import { queueable } from './offline';
import { shouldPersistQuery } from './query-client';

describe('format helpers', () => {
  it('humanizes enum values', () => {
    expect(humanize('BUILDING_COLLAPSE')).toBe('Building collapse');
    expect(humanize('OPEN')).toBe('Open');
  });

  it('pluralizes with Indian number formatting', () => {
    expect(pluralize(1, 'camp')).toBe('1 camp');
    expect(pluralize(120000, 'person', 'people')).toBe('1,20,000 people');
  });

  it('describes recent times', () => {
    expect(timeAgo(new Date().toISOString())).toBe('just now');
    expect(timeAgo(new Date(Date.now() - 3 * 3600_000).toISOString())).toBe('3 hours ago');
  });
});

describe('map helpers', () => {
  it('colours camps by how full they are', () => {
    expect(campColor({ status: 'OPEN', occupancy: 10, capacity: 100 })).toBe('#059669');
    expect(campColor({ status: 'OPEN', occupancy: 90, capacity: 100 })).toBe('#f59e0b');
    expect(campColor({ status: 'FULL', occupancy: 100, capacity: 100 })).toBe('#dc2626');
  });

  it('builds a point only from two real numbers', () => {
    expect(toPoint(11.5, 76.1)).toEqual({ latitude: 11.5, longitude: 76.1 });
    expect(toPoint(11.5, undefined)).toBeUndefined();
    expect(toPoint(Number.NaN, 76)).toBeUndefined();
    expect(toPoint('11.5', 76)).toBeUndefined();
  });
});

describe('offline storage rules (privacy)', () => {
  const query = (key: string, data: unknown, status = 'success') =>
    ({ queryKey: [key], state: { status, data } }) as unknown as Query;

  it('saves public data for offline use', () => {
    expect(shouldPersistQuery(query('camps', { items: [] }))).toBe(true);
    expect(shouldPersistQuery(query('needs', { items: [] }))).toBe(true);
  });

  it('never saves personal data on the device', () => {
    expect(shouldPersistQuery(query('evacuees', { items: [{ fullName: 'Asha' }] }))).toBe(false);
    expect(shouldPersistQuery(query('donations', { items: [] }))).toBe(false);
    expect(shouldPersistQuery(query('users', { items: [] }))).toBe(false);
    // Staff get reporters' phone numbers inside the (otherwise public) incident list.
    const staffIncidents = { items: [{ id: '1', reporterPhone: '9400000001' }] };
    expect(shouldPersistQuery(query('incidents', staffIncidents))).toBe(false);
  });

  it('does not save failed or loading queries', () => {
    expect(shouldPersistQuery(query('camps', undefined, 'error'))).toBe(false);
    expect(shouldPersistQuery(query('camps', undefined, 'pending'))).toBe(false);
  });
});

describe('queued offline actions', () => {
  it('gives every action its own idempotency key', () => {
    const a = queueable({ x: 1 });
    const b = queueable({ x: 1 });
    expect(a.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(a.idempotencyKey).not.toBe(b.idempotencyKey);
    expect(a.input).toEqual({ x: 1 });
  });
});
