import { describe, it, expect } from 'vitest';
import { scoreInstitution, deployableInstitutions, READINESS_THRESHOLD } from './readiness';
import { specFor } from './archetype-spec';
import type { Ministry } from '@/lib/api/types';

const base = (over: Partial<Ministry>): Ministry => ({
  id: 'm1', slug: 'health', name: 'Ministry of Health', archetype: 'HEALTH',
  status: 'active', createdAt: '2026-01-01T00:00:00Z',
  departments: [], modules: [], ...over,
});

describe('scoreInstitution', () => {
  it('an empty draft is not deployable and is draft lifecycle', () => {
    const r = scoreInstitution(base({ status: 'deactivated', departments: [], modules: [] }));
    expect(r.deployable).toBe(false);
    expect(r.lifecycle).toBe('draft');
    expect(r.blocking.length).toBeGreaterThan(0);
  });

  it('a fully composed active institution is deployable', () => {
    const r = scoreInstitution(base({
      status: 'active',
      departments: [{ id: 'd1', name: 'A' }, { id: 'd2', name: 'B' }, { id: 'd3', name: 'C' }],
      modules: [
        { moduleKey: 'approvals', enabled: true }, { moduleKey: 'queues', enabled: true },
        { moduleKey: 'field', enabled: true }, { moduleKey: 'analytics', enabled: true },
        { moduleKey: 'incidents', enabled: true }, { moduleKey: 'treasury', enabled: true },
      ],
    }));
    expect(r.total).toBeGreaterThanOrEqual(READINESS_THRESHOLD);
    expect(r.deployable).toBe(true);
    expect(['nationally-active', 'crisis-capable']).toContain(r.lifecycle);
    expect(r.blocking).toEqual([]);
  });

  it('composed-but-not-active stays pre-active', () => {
    const r = scoreInstitution(base({
      status: 'deactivated',
      departments: [{ id: 'd1', name: 'A' }],
      modules: [{ moduleKey: 'approvals', enabled: true }],
    }));
    expect(['composed', 'validated']).toContain(r.lifecycle);
    expect(r.dimensions).toHaveLength(10);
  });

  it('total is bounded 0..100 and dimensions clamped', () => {
    const r = scoreInstitution(base({ departments: Array.from({ length: 20 }).map((_, i) => ({ id: `d${i}`, name: 'x' })) }));
    expect(r.total).toBeLessThanOrEqual(100);
    for (const d of r.dimensions) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    }
  });
});

describe('archetype spec', () => {
  it('declares stricter governance for HEALTH than GENERIC', () => {
    expect(specFor('HEALTH').requiredDepartments).toBeGreaterThan(specFor('GENERIC').requiredDepartments);
    expect(specFor('HEALTH').requiredModules).toBeGreaterThan(specFor('GENERIC').requiredModules);
  });
  it('every archetype ships the standard surfaces + capabilities', () => {
    const s = specFor('FINANCE');
    expect(s.surfaces).toContain('command-room');
    expect(s.surfaces).toContain('crisis-wall');
    expect(s.capabilities).toContain('audit-chain');
  });
});

describe('readiness scores against the archetype spec', () => {
  it('HEALTH at full required structure scores governance/operational 100', () => {
    const spec = specFor('HEALTH');
    const r = scoreInstitution(base({
      status: 'active',
      departments: Array.from({ length: spec.requiredDepartments }).map((_, i) => ({ id: `d${i}`, name: 'x' })),
      modules: Array.from({ length: spec.requiredModules }).map((_, i) => ({ moduleKey: `m${i}`, enabled: true })),
    }));
    const gov = r.dimensions.find(d => d.key === 'governance')!;
    const ops = r.dimensions.find(d => d.key === 'operational')!;
    expect(gov.score).toBe(100);
    expect(ops.score).toBe(100);
  });
  it('partial structure scores proportionally below 100', () => {
    const r = scoreInstitution(base({ status: 'active', departments: [{ id: 'd', name: 'x' }], modules: [{ moduleKey: 'm', enabled: true }] }));
    const gov = r.dimensions.find(d => d.key === 'governance')!;
    expect(gov.score).toBeLessThan(100);
  });
});

describe('deployableInstitutions', () => {
  it('only surfaces active institutions, ranked by readiness', () => {
    const list: Ministry[] = [
      base({ id: 'a', status: 'active', departments: [{ id: 'd', name: 'x' }], modules: [{ moduleKey: 'm', enabled: true }] }),
      base({ id: 'b', status: 'deactivated' }),
      base({ id: 'c', status: 'active', departments: [{ id: '1', name: 'x' }, { id: '2', name: 'y' }, { id: '3', name: 'z' }], modules: [
        { moduleKey: 'a', enabled: true }, { moduleKey: 'b', enabled: true }, { moduleKey: 'c', enabled: true },
        { moduleKey: 'd', enabled: true }, { moduleKey: 'e', enabled: true }, { moduleKey: 'f', enabled: true },
      ] }),
    ];
    const out = deployableInstitutions(list);
    expect(out.map(o => o.ministry.id)).toEqual(['c', 'a']); // b excluded, c ranks first
    expect(out[0]!.readiness.total).toBeGreaterThanOrEqual(out[1]!.readiness.total);
  });
});
