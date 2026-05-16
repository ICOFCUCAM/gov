import { describe, it, expect } from 'vitest';
import { nationalRuntime } from './national-runtime';
import type { Ministry } from '@/lib/api/types';

const mk = (id: string, a: Ministry['archetype'], status: Ministry['status'] = 'active'): Ministry =>
  ({ id, name: id, slug: id.toLowerCase(), archetype: a, status, createdAt: '2026-01-01T00:00:00Z', departments: [], modules: [] });

describe('national operations runtime', () => {
  it('aggregates only active institutions, deterministic & bounded', () => {
    const mins = [mk('H', 'HEALTH'), mk('F', 'FINANCE'), mk('D', 'TRADE', 'deactivated')];
    const a = nationalRuntime(mins, 50);
    expect(a).toEqual(nationalRuntime(mins, 50));
    expect(a.institutions.length).toBe(2);
    expect(a.totalOpen).toBeGreaterThan(0);
    expect(a.meanLoad).toBeGreaterThanOrEqual(0);
    expect(a.meanLoad).toBeLessThanOrEqual(100);
    expect(['nominal', 'strained', 'overloaded']).toContain(a.posture);
    // sorted by load desc
    for (let i = 1; i < a.institutions.length; i++) {
      expect(a.institutions[i - 1]!.load).toBeGreaterThanOrEqual(a.institutions[i]!.load);
    }
    expect(a.worst).toEqual(a.institutions[0]);
  });

  it('empty government yields a coherent empty runtime', () => {
    const e = nationalRuntime([], 10);
    expect(e.institutions.length).toBe(0);
    expect(e.totalOpen).toBe(0);
    expect(e.worst).toBeNull();
    expect(e.posture).toBe('nominal');
  });
});
