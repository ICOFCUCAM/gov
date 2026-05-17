import { describe, it, expect } from 'vitest';
import { resiliencePropagation } from './resilience-propagation';
import type { Ministry } from '@/lib/api/types';

const MINS: Ministry[] = [
  { id: 'health', name: 'Health', slug: 'health', archetype: 'HEALTH', status: 'active', departments: [], modules: [] },
  { id: 'finance', name: 'Finance', slug: 'finance', archetype: 'FINANCE', status: 'active', departments: [], modules: [] },
  { id: 'energy', name: 'Energy', slug: 'energy', archetype: 'ENERGY', status: 'active', departments: [], modules: [] },
  { id: 'transport', name: 'Transport', slug: 'transport', archetype: 'TRANSPORT', status: 'active', departments: [], modules: [] },
] as unknown as Ministry[];

describe('resilience propagation (fabric-graph contagion)', () => {
  it('is deterministic and bounded', () => {
    const a = resiliencePropagation(MINS, 120);
    expect(a).toEqual(resiliencePropagation(MINS, 120));
    expect(['resilient', 'coupled', 'cascading']).toContain(a.fragility);
    for (const n of a.nodes) {
      expect(n.effective).toBeGreaterThanOrEqual(0);
      expect(n.effective).toBeLessThanOrEqual(100);
      // Contagion only ever *reduces* resilience — never amplifies it up.
      expect(n.effective).toBeLessThanOrEqual(n.base);
      expect(n.contagion).toBeGreaterThanOrEqual(0);
    }
  });

  it('mean effective never exceeds mean base (systemic drag is one-directional)', () => {
    for (const t of [10, 75, 200, 480]) {
      const r = resiliencePropagation(MINS, t);
      expect(r.meanEffective).toBeLessThanOrEqual(r.meanBase);
      expect(r.amplification).toBe(r.meanBase - r.meanEffective);
    }
  });

  it('orders nodes worst-first and exposes the hottest transmitting edge', () => {
    const r = resiliencePropagation(MINS, 300);
    for (let i = 1; i < r.nodes.length; i++) {
      expect(r.nodes[i - 1]!.effective).toBeLessThanOrEqual(r.nodes[i]!.effective);
    }
    expect(r.worst).toEqual(r.nodes[0] ?? null);
    if (r.hotPath) {
      expect(r.hotPath.transmitted).toBeGreaterThan(0);
      expect(r.hotPath.coupling).toBeGreaterThanOrEqual(0);
      expect(r.hotPath.coupling).toBeLessThanOrEqual(1);
    }
  });

  it('empty federation degrades gracefully', () => {
    const r = resiliencePropagation([], 50);
    expect(r.nodes.length).toBe(0);
    expect(r.worst).toBeNull();
    expect(r.fragility).toBe('resilient');
  });
});
