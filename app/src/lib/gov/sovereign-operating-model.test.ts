import { describe, it, expect } from 'vitest';
import {
  nationalOperatingState, ministryBehavior, cascadeChain, responseLatency,
  ministryReliability, corridorFatigue, forecast, OP_TICK,
  provinceMemory, diffuseTopology, territorialField, corridorAdjacency,
  executiveGate, commandVelocity, authorityChain, priorityConflict, GOV_STAGES,
  governIncident, pipeStage, mandateFor,
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

  it('territorial doctrine: memory persists, diffusion is topological & bounded', () => {
    const m = provinceMemory(2, 10);
    expect(m).toEqual(provinceMemory(2, 10));
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThanOrEqual(58);

    const adj = corridorAdjacency([[0, 1], [1, 2]], 3);
    expect(adj[1]).toEqual([0, 2]);
    // an isolated hot node bleeds into its neighbour after diffusion
    const d = diffuseTopology([100, 0, 0], adj);
    expect(d[1]!).toBeGreaterThan(0);
    expect(d[0]!).toBeLessThan(100);

    const f = territorialField(7, adj, 3);
    expect(f).toEqual(territorialField(7, adj, 3));
    expect(f.length).toBe(3);
    for (const v of f) { expect(v).toBeGreaterThanOrEqual(2); expect(v).toBeLessThanOrEqual(99); }
  });

  it('executive doctrine: severity accelerates, bureaucracy & gates drag', () => {
    // severity accelerates command velocity; treasury auth drags it
    const vCrit = commandVelocity(3, 0.5, 30);
    const vRoutineSlow = commandVelocity(1, 2.4, 80);
    expect(vCrit).toBeGreaterThan(vRoutineSlow);

    // unacknowledged crisis is held at the cabinet-review gate
    const held = executiveGate(3, 90, false, 1, 40);
    expect(held.idx).toBeLessThanOrEqual(2);
    expect(held.held).toBe(true);
    expect(GOV_STAGES).toContain(held.stage);

    // acknowledged critical progresses past the gate
    const moving = executiveGate(3, 90, true, 0.5, 20);
    expect(moving.idx).toBeGreaterThan(2);

    expect(authorityChain('HEALTH', 3)).toEqual(['HEALTH lead', 'Cabinet', 'Executive', 'Sovereign']);
    expect(authorityChain('TRADE', 1)).toEqual(['TRADE lead', 'Cabinet']);

    const pc = priorityConflict('HEALTH', 70);
    expect(typeof pc.text).toBe('string');
    expect(pc.tense).toBe(true);
  });

  it('governIncident is the single deterministic governing model', () => {
    const inp = {
      archetype: 'HEALTH', severity: 'sev1' as const, ageM: 40, ack: true,
      epoch: 5, ministryId: 'M-HEALTH', prop: 60, contention: 55, telecom: 88, reservesHeadroom: 40,
    };
    const g = governIncident(inp);
    expect(g).toEqual(governIncident(inp));
    expect(g.lvl).toBe(3);
    expect(g.pIdx).toBe(pipeStage(3, 40 / g.behavior.auth, true));
    expect(g.mandate).toBe(mandateFor(3));
    expect(['ok', 'warn', 'alert']).toContain(g.strainTone);
    expect(g.strain).toBeGreaterThanOrEqual(6);
    expect(g.strain).toBeLessThanOrEqual(99);
    expect(g.authority[0]).toBe('HEALTH lead');
    expect(GOV_STAGES).toContain(g.gate.stage);
    // unacknowledged crisis is held earlier in the pipeline than acknowledged
    const held = governIncident({ ...inp, ack: false });
    expect(held.pIdx).toBeLessThanOrEqual(g.pIdx);
  });
});
