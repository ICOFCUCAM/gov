import { describe, it, expect } from 'vitest';
import { executionChains, chainSummary } from './execution-chains';

const healthy = {
  treasuryOperational: 90, legislativeQuorum: true, legislativeBlocked: 0,
  judicialClearancePct: 85, judicialBacklog: 300, policeOperational: 85, healthOperational: 88,
};

describe('cross-institution execution chains', () => {
  it('healthy state yields no constraints (police relief only)', () => {
    const e = executionChains(healthy);
    expect(e.every(x => x.severity !== 'constraint')).toBe(true);
    expect(e.some(x => x.source === 'Police')).toBe(true);
  });

  it('treasury illiquidity constrains procurement institutions', () => {
    const e = executionChains({ ...healthy, treasuryOperational: 40 });
    const t = e.filter(x => x.source === 'Treasury');
    expect(t.length).toBe(4);
    expect(t.every(x => x.delta < 0 && x.severity === 'constraint')).toBe(true);
    expect(t.map(x => x.target).sort()).toEqual(['Education', 'Energy', 'Health', 'Transport']);
  });

  it('no quorum withholds fiscal authorisation; summary aggregates drag deterministically', () => {
    const i = { ...healthy, legislativeQuorum: false, treasuryOperational: 50, judicialClearancePct: 50, judicialBacklog: 1200, healthOperational: 40 };
    const s = chainSummary(i);
    expect(s).toEqual(chainSummary(i));
    expect(s.constraints).toBeGreaterThan(0);
    expect(s.systemicDrag).toBeGreaterThan(0);
    expect(s.effects.some(e => e.source === 'Legislature' && e.target === 'Treasury')).toBe(true);
    for (let k = 1; k < s.effects.length; k++) expect(s.effects[k - 1]!.delta).toBeLessThanOrEqual(s.effects[k]!.delta);
  });
});
