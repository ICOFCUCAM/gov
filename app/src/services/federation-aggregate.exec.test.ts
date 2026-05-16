import { describe, it, expect } from 'vitest';
import { sovereignExecutionIndex, federationPosture } from './federation-aggregate';
import { publish, version, eventLog, eventStats } from './event-bus';

describe('sovereign execution index', () => {
  it('is a bounded, weighted, deterministic composite', () => {
    const a = sovereignExecutionIndex({ federationOperational: 80, resilience: 70, runtimeLoad: 20, auditIntact: true });
    expect(a).toEqual(sovereignExecutionIndex({ federationOperational: 80, resilience: 70, runtimeLoad: 20, auditIntact: true }));
    expect(a.index).toBeGreaterThanOrEqual(0);
    expect(a.index).toBeLessThanOrEqual(100);
    expect(['operational', 'strained', 'degraded']).toContain(a.band);
    const w = a.drivers.reduce((s, d) => s + d.weight, 0);
    expect(w).toBeCloseTo(1, 5);
    const broken = sovereignExecutionIndex({ federationOperational: 40, resilience: 30, runtimeLoad: 90, auditIntact: false });
    expect(broken.index).toBeLessThan(a.index);
    expect(broken.band).toBe('degraded');
  });
});

describe('event bus', () => {
  it('publish increments version and is queryable', () => {
    const v0 = version();
    publish('institution.metric', 'ministry-health', { domain: 'health' });
    expect(version()).toBe(v0 + 1);
    expect(eventLog(5)[0]!.type).toBe('institution.metric');
    expect(eventLog(5, 'institution.metric')[0]!.source).toBe('ministry-health');
    expect(eventStats().total).toBeGreaterThan(0);
  });
});

describe('operational causality (exec injection)', () => {
  it('operator execution raises an institution\'s emergent operational posture', () => {
    const mk = (id: string, a: 'HEALTH') => ({ id, name: id, slug: id, archetype: a, status: 'active' as const, createdAt: '2026-01-01T00:00:00Z', departments: [], modules: [] });
    const mins = [mk('H', 'HEALTH')];
    const base = federationPosture(mins as never, 50);
    const lifted = federationPosture(mins as never, 50, () => 15);
    const dropped = federationPosture(mins as never, 50, () => -15);
    expect(lifted.institutions[0]!.operational).toBeGreaterThanOrEqual(base.institutions[0]!.operational);
    expect(dropped.institutions[0]!.operational).toBeLessThanOrEqual(base.institutions[0]!.operational);
    expect(lifted.institutions[0]!.operational).toBeLessThanOrEqual(100);
    expect(dropped.institutions[0]!.operational).toBeGreaterThanOrEqual(0);
  });
});
