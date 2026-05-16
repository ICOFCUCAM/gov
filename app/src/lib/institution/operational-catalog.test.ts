import { describe, it, expect } from 'vitest';
import { subsystemsFor, subsystemCount } from './operational-catalog';

describe('operational catalog', () => {
  it('gives each archetype distinct institutional machinery', () => {
    const health = subsystemsFor('HEALTH').map(s => s.name);
    const energy = subsystemsFor('ENERGY').map(s => s.name);
    expect(health).toContain('Tertiary hospitals');
    expect(energy).toContain('Generation plants');
    expect(health).not.toEqual(energy);
  });

  it('every archetype declares at least four subsystems with positive scale', () => {
    const keys = ['HEALTH', 'EDUCATION', 'FINANCE', 'AGRICULTURE', 'ENERGY', 'TRANSPORT',
      'JUSTICE', 'ENVIRONMENT', 'INTERIOR', 'LABOR', 'TRADE', 'GENERIC'] as const;
    for (const k of keys) {
      const s = subsystemsFor(k);
      expect(s.length).toBeGreaterThanOrEqual(4);
      expect(subsystemCount(k)).toBe(s.length);
      for (const c of s) {
        expect(c.scale).toBeGreaterThan(0);
        expect(c.name.length).toBeGreaterThan(0);
        expect(c.unit.length).toBeGreaterThan(0);
      }
    }
  });

  it('falls back to GENERIC for an unknown archetype', () => {
    // @ts-expect-error intentional unknown key
    expect(subsystemsFor('NOPE')).toEqual(subsystemsFor('GENERIC'));
  });
});
