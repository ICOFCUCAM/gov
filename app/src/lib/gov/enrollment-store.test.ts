import { describe, it, expect } from 'vitest';
import { enrollments, enroll, advanceEnrollment, enrollmentTally, version } from './enrollment-store';

describe('enrollment-store', () => {
  it('seeds a deterministic non-empty register', () => {
    const a = enrollments('HEALTH', 'HSP-1', 'Physician', 1_000_000);
    expect(a.length).toBeGreaterThanOrEqual(2);
    expect(a.every(e => ['pending', 'verified', 'active'].includes(e.status))).toBe(true);
    expect(a.every(e => e.ministryKey === 'HEALTH' && e.facilityId === 'HSP-1')).toBe(true);
  });

  it('enrol appends a pending registration and bumps version', () => {
    const v0 = version();
    enroll('INTERIOR', 'STN-3', 'Jane Doe', 'Officer', 'Citizen self-service', 2_000_000);
    expect(version()).toBeGreaterThan(v0);
    const list = enrollments('INTERIOR', 'STN-3', 'Officer', 2_000_000);
    const mine = list.find(e => e.name === 'Jane Doe')!;
    expect(mine.status).toBe('pending');
    expect(mine.by).toBe('Citizen self-service');
  });

  it('advanceEnrollment walks pending → verified → active and stops', () => {
    enroll('TRADE', 'TRD-4', 'A. Vendor', 'Trade officer', 'Desk', 3_000_000);
    const r = enrollments('TRADE', 'TRD-4', 'Trade officer', 3_000_000).find(e => e.name === 'A. Vendor')!;
    advanceEnrollment('TRADE', 'TRD-4', r.id, 3_000_000);
    expect(enrollments('TRADE', 'TRD-4', 'Trade officer', 3_000_000).find(e => e.id === r.id)!.status).toBe('verified');
    advanceEnrollment('TRADE', 'TRD-4', r.id, 3_000_000);
    advanceEnrollment('TRADE', 'TRD-4', r.id, 3_000_000);
    expect(enrollments('TRADE', 'TRD-4', 'Trade officer', 3_000_000).find(e => e.id === r.id)!.status).toBe('active');
  });

  it('enrollmentTally aggregates totals/pending/active across keys', () => {
    enroll('LABOR', 'LAB-7', 'P. One', 'Inspector', 'Desk', 4_000_000);
    const t = enrollmentTally([{ ministryKey: 'LABOR', facilityId: 'LAB-7', role: 'Inspector' }], 4_000_000);
    expect(t.total).toBeGreaterThanOrEqual(1);
    expect(t.pending + t.active).toBeLessThanOrEqual(t.total);
    expect(t.pending).toBeGreaterThanOrEqual(1);
  });
});
