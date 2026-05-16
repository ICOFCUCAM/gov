import { describe, it, expect } from 'vitest';
import { serviceKpisFor, serviceReadings } from './ministry-services';

describe('archetype service operations', () => {
  it('each archetype has a distinct service signature', () => {
    expect(serviceKpisFor('HEALTH').some(k => k.l === 'ICU occupancy')).toBe(true);
    expect(serviceKpisFor('FINANCE').some(k => k.l === 'Revenue collection')).toBe(true);
    expect(serviceKpisFor('HEALTH')).not.toEqual(serviceKpisFor('ENERGY'));
  });

  it('readings are deterministic, bounded, toned', () => {
    const a = serviceReadings('m1', 'HEALTH', 120);
    const b = serviceReadings('m1', 'HEALTH', 120);
    expect(a).toEqual(b);
    for (const r of a) {
      expect(r.value).toBeGreaterThanOrEqual(r.lo);
      expect(r.value).toBeLessThanOrEqual(r.hi);
      expect(['ok', 'warn', 'alert']).toContain(r.tone);
    }
  });

  it('unknown archetype falls back to GENERIC', () => {
    // @ts-expect-error unknown key
    expect(serviceKpisFor('NOPE')).toEqual(serviceKpisFor('GENERIC'));
  });
});
