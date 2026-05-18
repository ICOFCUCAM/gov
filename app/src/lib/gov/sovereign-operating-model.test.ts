import { describe, it, expect } from 'vitest';
import {
  nationalOperatingState, ministryBehavior, cascadeChain, responseLatency,
  ministryReliability, corridorFatigue, forecast, OP_TICK,
} from './sovereign-operating-model';

describe('sovereign operating model', () => {
  it('operating state is deterministic, bounded and finite-capacity', () => {
    const a = nationalOperatingState(80, 50, 70, 3, 6, 4);
    expect(a).toEqual(nationalOperatingState(80, 50, 70, 3, 6, 4));
    for (const r of Object.values(a.resources)) {
      expect(r.util).toBeGreaterThanOrEqual(0);
      expect(r.util).toBeLessThanOrEqual(100);
      expect(r.util + r.headroom).toBe(100);
      expect(['ok', 'warn', 'alert']).toContain(r.tone);
    }
    expect(a.contention).toBeGreaterThanOrEqual(0);
    expect(a.contention).toBeLessThanOrEqual(100);
    expect(OP_TICK).toBe(4000);
  });

  it('contention rises with national load (finite competition)', () => {
    const lo = nationalOperatingState(40, 20, 25, 0, 1, 2).contention;
    const hi = nationalOperatingState(40, 95, 98, 6, 9, 2).contention;
    expect(hi).toBeGreaterThan(lo);
  });

  it('ministries have distinct institutional behaviour', () => {
    const fin = ministryBehavior('FINANCE');
    const emg = ministryBehavior('EMERGENCY');
    expect(fin.auth).toBeGreaterThan(emg.auth);          // treasury authorizes slower
    expect(emg.aggression).toBeGreaterThan(fin.aggression);
    expect(fin.reserveSensitive).toBe(true);
  });

  it('cascade depth scales with severity and is acyclic', () => {
    const c1 = cascadeChain('ENERGY', 1);
    const c3 = cascadeChain('ENERGY', 3);
    expect(c3.depth).toBeGreaterThanOrEqual(c1.depth);
    expect(new Set(c3.hops).size).toBe(c3.hops.length);
    expect(c3.hops[0]).toBe('ENERGY');
  });

  it('response latency reflects severity, load and telecom integrity', () => {
    const fast = responseLatency('EMERGENCY', 3, 30, 99, 80).totalMin;
    const slow = responseLatency('FINANCE', 1, 90, 60, 20).totalMin;
    expect(slow).toBeGreaterThan(fast);
    for (const s of responseLatency('HEALTH', 2, 50, 90, 60).stages) {
      expect(s.min).toBeGreaterThanOrEqual(0);
    }
  });

  it('operational memory is bounded and continuous', () => {
    for (const e of [0, 5, 20]) {
      const f = corridorFatigue('C1', e), r = ministryReliability('HEALTH', e);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(100);
      expect(r).toBeGreaterThanOrEqual(48);
      expect(r).toBeLessThanOrEqual(99);
    }
    expect(corridorFatigue('C1', 12)).toEqual(corridorFatigue('C1', 12));
  });

  it('forecast projects forward with a risk band', () => {
    const f = forecast('fc:test', 70, 80, true);
    expect(f).toEqual(forecast('fc:test', 70, 80, true));
    expect(['ok', 'warn', 'alert']).toContain(f.risk);
    expect(f.h24).toBeGreaterThanOrEqual(0);
    expect(f.h72).toBeLessThanOrEqual(100);
  });
});
