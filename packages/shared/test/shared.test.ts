import { describe, expect, it } from 'vitest';
import {
  createIncidentSchema,
  distanceKm,
  nearbyCampsQuerySchema,
  phoneSchema,
  registerSchema,
  verifyAlertsSchema,
} from '../src';

describe('distanceKm (haversine)', () => {
  it('is zero for the same point', () => {
    expect(distanceKm({ latitude: 10, longitude: 76 }, { latitude: 10, longitude: 76 })).toBe(0);
  });

  it('matches known distances: Kochi to Thiruvananthapuram is about 195 km', () => {
    const kochi = { latitude: 9.9312, longitude: 76.2673 };
    const tvm = { latitude: 8.5241, longitude: 76.9366 };
    expect(distanceKm(kochi, tvm)).toBeGreaterThan(170);
    expect(distanceKm(kochi, tvm)).toBeLessThan(200);
  });

  it('is symmetric', () => {
    const a = { latitude: 11.6, longitude: 76.08 };
    const b = { latitude: 8.52, longitude: 76.93 };
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 10);
  });
});

describe('validation schemas', () => {
  it('accepts Indian mobile numbers only', () => {
    expect(phoneSchema.safeParse('9400000001').success).toBe(true);
    expect(phoneSchema.safeParse('+919400000001').success).toBe(true);
    expect(phoneSchema.safeParse('5400000001').success).toBe(false); // must start 6-9
    expect(phoneSchema.safeParse('94000').success).toBe(false);
  });

  it('normalises emails and enforces password length at registration', () => {
    const base = { fullName: 'A', phone: '9400000001', district: 'wayanad', skills: [] };
    const ok = registerSchema.parse({
      ...base,
      email: ' Asha@Example.COM ',
      password: 'ten chars!',
    });
    expect(ok.email).toBe('asha@example.com');
    expect(registerSchema.safeParse({ ...base, email: 'a@b.co', password: 'short' }).success).toBe(
      false,
    );
  });

  it('rejects unknown districts', () => {
    const res = createIncidentSchema.safeParse({
      type: 'FLOOD',
      severity: 'HIGH',
      description: 'Water rising',
      locationText: 'Somewhere',
      district: 'atlantis',
    });
    expect(res.success).toBe(false);
  });

  it('coerces query-string numbers and booleans', () => {
    const q = nearbyCampsQuerySchema.parse({ lat: '11.5', lng: '76.1', hasSpace: 'false' });
    expect(q).toMatchObject({ lat: 11.5, lng: 76.1, hasSpace: false, radiusKm: 50, limit: 5 });
  });

  it('accepts only 6-digit codes', () => {
    const id = '0191f0a0-0000-7000-8000-000000000000';
    expect(verifyAlertsSchema.safeParse({ subscriptionId: id, code: '123456' }).success).toBe(true);
    expect(verifyAlertsSchema.safeParse({ subscriptionId: id, code: '12345' }).success).toBe(false);
    expect(verifyAlertsSchema.safeParse({ subscriptionId: id, code: '12a456' }).success).toBe(
      false,
    );
  });
});
