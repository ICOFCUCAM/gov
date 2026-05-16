import { describe, it, expect } from 'vitest';
import { seed, toneFor, wave, waveSeries, domainStress } from './telemetry';

describe('seed', () => {
  it('is deterministic for the same key', () => {
    expect(seed('ministry:health')).toBe(seed('ministry:health'));
  });
  it('returns a value in [0, 1)', () => {
    for (const k of ['a', 'energy:42', 'ds:x:ops', 'long-key-value-here']) {
      const v = seed(k);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('differs across distinct keys', () => {
    expect(seed('alpha')).not.toBe(seed('beta'));
  });
});

describe('toneFor', () => {
  it('maps risk bands to tones', () => {
    expect(toneFor(10)).toBe('ok');
    expect(toneFor(45)).toBe('neutral');
    expect(toneFor(60)).toBe('warn');
    expect(toneFor(90)).toBe('alert');
  });
});

describe('wave', () => {
  it('stays within [lo, hi]', () => {
    for (let t = 0; t < 200; t += 7) {
      const v = wave('grid:pressure', t, 20, 80);
      expect(v).toBeGreaterThanOrEqual(20);
      expect(v).toBeLessThanOrEqual(80);
    }
  });
  it('is deterministic for the same (key, t)', () => {
    expect(wave('k', 12.5, 0, 100)).toBe(wave('k', 12.5, 0, 100));
  });
  it('moves over time (not flat)', () => {
    const a = wave('k', 0, 0, 100);
    const b = wave('k', 50, 0, 100);
    expect(a).not.toBe(b);
  });
});

describe('waveSeries', () => {
  it('returns n points all within range', () => {
    const s = waveSeries('series:x', 100, 16, 30, 90);
    expect(s).toHaveLength(16);
    expect(Math.min(...s)).toBeGreaterThanOrEqual(30);
    expect(Math.max(...s)).toBeLessThanOrEqual(90);
  });
});

describe('domainStress', () => {
  it('clamps to [4, 99] and is integer', () => {
    for (const a of ['ENERGY', 'FINANCE', 'INTERIOR', 'UNKNOWN']) {
      const v = domainStress(a, 'ops', 60, 33, 'min-1');
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(4);
      expect(v).toBeLessThanOrEqual(99);
    }
  });
  it('differentiates archetypes (Energy infra-heavier than Finance)', () => {
    // Bias-dominated comparison at fixed t/pressure/key.
    const energy = domainStress('ENERGY', 'infra', 50, 10, 'k');
    const finance = domainStress('FINANCE', 'infra', 50, 10, 'k');
    expect(energy).toBeGreaterThan(finance);
  });
  it('falls back to GENERIC for unknown archetype', () => {
    const v = domainStress('NOT_A_REAL_ARCH', 'sec', 40, 5, 'z');
    expect(v).toBeGreaterThanOrEqual(4);
  });
});
