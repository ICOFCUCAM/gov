import { describe, it, expect } from 'vitest';
import { interoperabilityFabric } from './interoperability-fabric';
import type { Ministry } from '@/lib/api/types';

const mk = (id: string, a: Ministry['archetype'], status: Ministry['status'] = 'active'): Ministry =>
  ({ id, name: id, slug: id.toLowerCase(), archetype: a, status, createdAt: '2026-01-01T00:00:00Z', departments: [], modules: [] });

describe('interoperability fabric (emergent dependency mesh)', () => {
  it('derives edges only between active institutions, deterministically', () => {
    const mins = [mk('H', 'HEALTH'), mk('F', 'FINANCE'), mk('T', 'TRANSPORT'), mk('X', 'ENERGY', 'deactivated')];
    const a = interoperabilityFabric(mins, 60);
    expect(a).toEqual(interoperabilityFabric(mins, 60));
    expect(a.nodes).toBe(3);
    for (const e of a.edges) {
      expect(['H', 'F', 'T']).toContain(e.from);
      expect(['H', 'F', 'T']).toContain(e.to);
      expect(e.from).not.toBe(e.to);
      expect(e.health).toBeGreaterThanOrEqual(0);
      expect(e.health).toBeLessThanOrEqual(100);
      expect(['ok', 'warn', 'alert']).toContain(e.tone);
    }
    // sorted weakest-first
    for (let i = 1; i < a.edges.length; i++) expect(a.edges[i - 1]!.health).toBeLessThanOrEqual(a.edges[i]!.health);
    expect(['cohesive', 'strained', 'fragmented']).toContain(a.posture);
  });

  it('no institutions → cohesive empty fabric', () => {
    const e = interoperabilityFabric([], 10);
    expect(e.edges.length).toBe(0);
    expect(e.meanHealth).toBe(100);
    expect(e.posture).toBe('cohesive');
  });
});
