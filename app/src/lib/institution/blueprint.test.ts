import { describe, it, expect } from 'vitest';
import {
  blueprintFor, instantiateInstitution, instantiateMinistry, systemReadout,
  type InstitutionKind,
} from './blueprint';
import type { Ministry } from '@/lib/api/types';

const KINDS: InstitutionKind[] = [
  'HEALTH', 'EDUCATION', 'FINANCE', 'AGRICULTURE', 'ENERGY', 'TRANSPORT',
  'JUSTICE', 'ENVIRONMENT', 'INTERIOR', 'LABOR', 'TRADE', 'GENERIC',
  'LEGISLATURE', 'JUDICIARY',
];

describe('institutional blueprint factory', () => {
  it('every institution kind has a rich, non-empty blueprint', () => {
    for (const k of KINDS) {
      const bp = blueprintFor(k);
      expect(bp.length).toBeGreaterThanOrEqual(5);
      for (const g of bp) {
        expect(g.systems.length).toBeGreaterThan(0);
        expect(g.name.length).toBeGreaterThan(0);
        expect(g.purpose.length).toBeGreaterThan(0);
      }
    }
  });

  it('HEALTH matches the sovereign institutional model (command → emergency)', () => {
    const bp = blueprintFor('HEALTH');
    const names = bp.map(g => g.name);
    expect(names).toContain('Health Command');
    expect(names).toContain('Hospital Network');
    expect(names).toContain('Doctor Systems');
    expect(names).toContain('Patient Systems');
    expect(names).toContain('Emergency Medical Systems');
    const cmd = bp.find(g => g.key === 'command')!;
    expect(cmd.systems.map(s => s.name)).toContain('National healthcare command centre');
  });

  it('before activation the ecosystem is blueprinted but not provisioned', () => {
    const eco = instantiateInstitution({ id: 'MIN-1', kind: 'HEALTH', activated: false }, 50);
    expect(eco.activated).toBe(false);
    expect(eco.stats.systems).toBeGreaterThan(0);
    expect(eco.stats.provisioning).toBe(eco.stats.systems);
    expect(eco.stats.operational).toBe(0);
    expect(eco.groups.every(g => g.systems.every(s => s.status === 'provisioning'))).toBe(true);
  });

  it('activation instantiates the full ecosystem, deterministically & bounded', () => {
    const a = instantiateInstitution({ id: 'MIN-1', kind: 'HEALTH', activated: true }, 50);
    const b = instantiateInstitution({ id: 'MIN-1', kind: 'HEALTH', activated: true }, 50);
    expect(a).toEqual(b);
    expect(a.stats.provisioning).toBe(0);
    expect(a.stats.operational + a.stats.degraded).toBe(a.stats.systems);
    expect(a.stats.meanHealth).toBeGreaterThanOrEqual(0);
    expect(a.stats.meanHealth).toBeLessThanOrEqual(100);
    for (const g of a.groups) {
      expect(['ok', 'warn', 'alert']).toContain(g.tone);
      for (const s of g.systems) {
        expect(s.uptime).toBeGreaterThanOrEqual(0);
        expect(s.uptime).toBeLessThanOrEqual(100);
      }
    }
  });

  it('every instantiated system has a kind-appropriate, deterministic readout', () => {
    const eco = instantiateInstitution({ id: 'MIN-7', kind: 'HEALTH', activated: true }, 40);
    for (const g of eco.groups) {
      for (const s of g.systems) {
        const a = systemReadout('MIN-7', g.key, s, 40);
        const b = systemReadout('MIN-7', g.key, s, 40);
        expect(a).toEqual(b);
        expect(a.length).toBeGreaterThan(0);
        for (const m of a) {
          expect(m.label.length).toBeGreaterThan(0);
          expect(m.value.length).toBeGreaterThan(0);
          expect(['ok', 'warn', 'alert']).toContain(m.tone);
        }
      }
    }
  });

  it('instantiateMinistry maps ministry status to activation', () => {
    const m = { id: 'MIN-9', archetype: 'FINANCE', status: 'active' } as unknown as Ministry;
    const eco = instantiateMinistry(m, 30);
    expect(eco.kind).toBe('FINANCE');
    expect(eco.activated).toBe(true);
    expect(eco.stats.provisioning).toBe(0);
  });
});
