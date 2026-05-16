import { describe, it, expect } from 'vitest';
import { federationPosture } from './federation-aggregate';
import type { Ministry } from '@/lib/api/types';

const mk = (id: string, a: Ministry['archetype'], status: Ministry['status'] = 'active'): Ministry =>
  ({ id, name: id, slug: id.toLowerCase(), archetype: a, status, createdAt: '2026-01-01T00:00:00Z', departments: [], modules: [] });

describe('federation aggregate (emergent national posture)', () => {
  it('derives whole-of-government posture only from active institutions, deterministically', () => {
    const mins = [mk('H', 'HEALTH'), mk('F', 'FINANCE'), mk('E', 'ENERGY'), mk('X', 'TRADE', 'deactivated')];
    const a = federationPosture(mins, 60);
    expect(a).toEqual(federationPosture(mins, 60));
    expect(a.institutions.length).toBe(3);
    expect(a.meanOperational).toBeGreaterThanOrEqual(0);
    expect(a.meanOperational).toBeLessThanOrEqual(100);
    expect(['stable', 'strained', 'critical']).toContain(a.posture);
    for (let i = 1; i < a.institutions.length; i++) {
      expect(a.institutions[i - 1]!.operational).toBeLessThanOrEqual(a.institutions[i]!.operational);
    }
    expect(a.worst).toEqual(a.institutions[0]);
    for (const it of a.institutions) {
      expect(it.operational).toBe(100 - it.instability);
      expect(['ok', 'warn', 'alert']).toContain(it.tone);
    }
  });

  it('empty government is vacuously stable', () => {
    const e = federationPosture([], 10);
    expect(e.institutions.length).toBe(0);
    expect(e.meanOperational).toBe(100);
    expect(e.posture).toBe('stable');
    expect(e.worst).toBeNull();
  });
});
