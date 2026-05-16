import { describe, it, expect } from 'vitest';
import { stateFabric } from './state-fabric';
import type { Ministry } from '@/lib/api/types';

const mk = (id: string, a: Ministry['archetype']): Ministry =>
  ({ id, name: id, slug: id.toLowerCase(), archetype: a, status: 'active', createdAt: '2026-01-01T00:00:00Z', departments: [], modules: [] });

describe('interconnected state fabric', () => {
  it('propagates every source domain deterministically and bounded', () => {
    const mins = [mk('H', 'HEALTH'), mk('F', 'FINANCE'), mk('T', 'TRANSPORT')];
    const a = stateFabric(mins, 60);
    expect(a).toEqual(stateFabric(mins, 60));
    expect(a.domains.map(d => d.domain)).toEqual(['healthcare', 'treasury', 'legislative', 'judicial']);
    for (const d of a.domains) {
      expect(d.instability).toBeGreaterThanOrEqual(0);
      expect(d.instability).toBeLessThanOrEqual(100);
      expect(['ok', 'warn', 'alert']).toContain(d.tone);
      expect(d.effects.length).toBeGreaterThan(0);
      for (const e of d.effects) {
        expect(e.magnitude).toBeGreaterThanOrEqual(0);
        expect(e.magnitude).toBeLessThanOrEqual(100);
        expect(e.target.length).toBeGreaterThan(0);
      }
    }
    expect(a.systemicStress).toBeGreaterThanOrEqual(0);
    expect(a.systemicStress).toBeLessThanOrEqual(100);
    expect(['stable', 'coupled-stress', 'systemic']).toContain(a.contagion);
    expect(a.sectors.length).toBe(3);
    for (let i = 1; i < a.sectors.length; i++) expect(a.sectors[i - 1]!.instability).toBeGreaterThanOrEqual(a.sectors[i]!.instability);
    for (const s of a.sectors) {
      expect(s.instability).toBeGreaterThanOrEqual(0);
      expect(s.instability).toBeLessThanOrEqual(100);
      expect(['ok', 'warn', 'alert']).toContain(s.tone);
    }
  });

  it('works with no institutions (seeded baseline) and identifies the worst domain', () => {
    const s = stateFabric([], 33);
    expect(['healthcare', 'treasury', 'legislative', 'judicial']).toContain(s.worst);
    const maxI = Math.max(...s.domains.map(d => d.instability));
    expect(s.domains.find(d => d.domain === s.worst)!.instability).toBe(maxI);
  });
});
