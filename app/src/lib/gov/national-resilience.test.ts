import { describe, it, expect } from 'vitest';
import { nationalResilience } from './national-resilience';
import type { Ministry } from '@/lib/api/types';

const MINS: Ministry[] = [
  { id: 'health', name: 'Health Ministry', slug: 'health', archetype: 'HEALTH', status: 'active', departments: [], modules: [] },
  { id: 'finance', name: 'Finance Ministry', slug: 'finance', archetype: 'FINANCE', status: 'active', departments: [], modules: [] },
  { id: 'energy', name: 'Energy Ministry', slug: 'energy', archetype: 'ENERGY', status: 'active', departments: [], modules: [] },
] as unknown as Ministry[];

describe('national resilience index', () => {
  it('produces a bounded, weighted, coherent composite that is deterministic', () => {
    const a = nationalResilience(MINS, 90);
    const b = nationalResilience(MINS, 90);
    expect(a).toEqual(b);
    expect(a.index).toBeGreaterThanOrEqual(0);
    expect(a.index).toBeLessThanOrEqual(100);
    expect(['robust', 'sound', 'fragile', 'brittle']).toContain(a.band);
    expect(a.pillars.length).toBe(5);
    for (const p of a.pillars) {
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(100);
      expect(['ok', 'warn', 'alert']).toContain(p.tone);
    }
    const wsum = a.pillars.reduce((x, p) => x + p.weight, 0);
    expect(wsum).toBeCloseTo(1, 5);
    expect(a.weakest).not.toBeNull();
    expect(a.pillars.every(p => p.score >= a.weakest!.score)).toBe(true);
  });

  it('handles an empty institutional set without throwing', () => {
    const r = nationalResilience([], 40);
    expect(r.index).toBeGreaterThanOrEqual(0);
    expect(r.index).toBeLessThanOrEqual(100);
  });
});
