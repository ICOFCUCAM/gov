import { describe, it, expect } from 'vitest';
import { cascadeEscalations } from './cascade-escalation';
import type { CascadeNode } from './cascade';

const node = (over: Partial<CascadeNode>): CascadeNode => ({
  id: 'n', name: 'Health Ministry', baseStress: 0, inheritedStress: 0,
  totalStress: 0, posture: 'stable', contributors: [], ...over,
});

describe('cascade escalation engine', () => {
  it('produces no escalations from a stable fabric', () => {
    expect(cascadeEscalations([node({}), node({ id: 'b', posture: 'watch', totalStress: 35 })])).toEqual([]);
  });

  it('escalates critical and strained nodes with routed recommendations', () => {
    const out = cascadeEscalations([
      node({ id: 'h', name: 'Health Ministry', posture: 'critical', totalStress: 82, inheritedStress: 40, contributors: [{ name: 'Finance Ministry', via: 'budget', amount: 30 }] }),
      node({ id: 't', name: 'Transport Ministry', posture: 'strained', totalStress: 55, contributors: [{ name: 'Energy Ministry', via: 'fuel', amount: 18 }] }),
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]!.severity).toBe('critical');
    expect(out[0]!.route).toBe('/gov/situation-room');
    expect(out[0]!.driver).toBe('Finance');
    expect(out[1]!.severity).toBe('elevated');
    expect(out[1]!.route).toBe('/gov/coordination');
  });

  it('is deterministic and ranked by total stress', () => {
    const ns = [
      node({ id: 'a', posture: 'strained', totalStress: 50 }),
      node({ id: 'b', posture: 'critical', totalStress: 90 }),
    ];
    const x = cascadeEscalations(ns);
    expect(x).toEqual(cascadeEscalations(ns));
    expect(x[0]!.totalStress).toBeGreaterThanOrEqual(x[1]!.totalStress);
  });
});
