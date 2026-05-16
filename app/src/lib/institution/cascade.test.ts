import { describe, it, expect } from 'vitest';
import { buildCascade } from './cascade';
import type { Ministry } from '@/lib/api/types';

const mk = (id: string, archetype: Ministry['archetype'], status: Ministry['status'] = 'active'): Ministry => ({
  id, slug: id, name: `${archetype}`, archetype, status,
  createdAt: '2026-01-01T00:00:00Z', departments: [], modules: [],
});

describe('cascade propagation engine', () => {
  it('a healthy state has near-zero stress everywhere', () => {
    const c = buildCascade([mk('h', 'HEALTH'), mk('f', 'FINANCE'), mk('t', 'TRANSPORT')], () => 100);
    expect(c.every(n => n.totalStress === 0)).toBe(true);
    expect(c.every(n => n.posture === 'stable')).toBe(true);
  });

  it('degrading a provider propagates inherited stress to its dependents', () => {
    // Health consumes Finance; degrade Finance only.
    const health = (id: string) => (id === 'f' ? 10 : 100);
    const c = buildCascade([mk('h', 'HEALTH'), mk('f', 'FINANCE'), mk('t', 'TRANSPORT')], health);
    const h = c.find(n => n.id === 'h')!;
    expect(h.baseStress).toBe(0);
    expect(h.inheritedStress).toBeGreaterThan(0);
    expect(h.contributors.some(x => x.name === 'FINANCE')).toBe(true);
  });

  it('totals are clamped and ranked by total stress', () => {
    const c = buildCascade([mk('h', 'HEALTH'), mk('f', 'FINANCE')], (id) => (id === 'f' ? 0 : 60));
    for (const n of c) {
      expect(n.totalStress).toBeGreaterThanOrEqual(0);
      expect(n.totalStress).toBeLessThanOrEqual(100);
    }
    expect(c[0]!.totalStress).toBeGreaterThanOrEqual(c[c.length - 1]!.totalStress);
  });

  it('only active institutions participate; deterministic', () => {
    const a = buildCascade([mk('h', 'HEALTH'), mk('x', 'ENERGY', 'deactivated')], () => 50);
    const b = buildCascade([mk('h', 'HEALTH'), mk('x', 'ENERGY', 'deactivated')], () => 50);
    expect(a.length).toBe(1);
    expect(a).toEqual(b);
  });
});
