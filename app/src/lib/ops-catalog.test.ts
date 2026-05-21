import { describe, it, expect } from 'vitest';
import { specFor, OPS_CATALOG, GENERIC_SPEC } from './ops-catalog';

describe('specFor', () => {
  it('returns a known catalog entry when the key matches', () => {
    const spec = specFor('facilities');
    expect(spec.title).toBe('Facilities oversight');
    expect(spec.kpis.length).toBeGreaterThan(0);
  });

  it('falls back to GENERIC_SPEC with the unknown key as the title', () => {
    const spec = specFor('completely-unknown-module');
    expect(spec.title).toBe('completely-unknown-module');
    expect(spec.kpis).toEqual(GENERIC_SPEC.kpis);
    expect(spec.queues).toEqual(GENERIC_SPEC.queues);
    expect(spec.alerts).toEqual(GENERIC_SPEC.alerts);
  });
});

describe('OPS_CATALOG', () => {
  it('every entry has a non-empty title', () => {
    for (const [key, spec] of Object.entries(OPS_CATALOG)) {
      expect(spec.title, `module ${key}`).toBeTruthy();
    }
  });

  it('every kpi declares both direction and a range pair', () => {
    for (const [key, spec] of Object.entries(OPS_CATALOG)) {
      for (const k of spec.kpis) {
        expect(['higher-better', 'lower-better'], `${key}/${k.key}`).toContain(k.direction);
        expect(k.range, `${key}/${k.key}`).toHaveLength(2);
        expect(k.range[0]!).toBeLessThanOrEqual(k.range[1]!);
      }
    }
  });

  it('every queue declares a positive SLA window', () => {
    for (const [key, spec] of Object.entries(OPS_CATALOG)) {
      for (const q of spec.queues) {
        expect(q.slaHours, `${key}/${q.key}`).toBeGreaterThan(0);
      }
    }
  });

  it('every alert likelihood is a probability between 0 and 1', () => {
    for (const [key, spec] of Object.entries(OPS_CATALOG)) {
      for (const a of spec.alerts) {
        expect(a.likelihood, `${key}/${a.key}`).toBeGreaterThanOrEqual(0);
        expect(a.likelihood, `${key}/${a.key}`).toBeLessThanOrEqual(1);
      }
    }
  });
});
