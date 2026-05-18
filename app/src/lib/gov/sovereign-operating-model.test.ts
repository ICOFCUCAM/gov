import { describe, it, expect } from 'vitest';
import {
  nationalOperatingState, ministryBehavior, cascadeChain, responseLatency,
  ministryReliability, corridorFatigue, forecast, OP_TICK,
  provinceMemory, diffuseTopology, territorialField, corridorAdjacency,
  executiveGate, commandVelocity, authorityChain, priorityConflict, GOV_STAGES,
  governIncident, pipeStage, mandateFor,
  institutionalFatigue, attentionWeight, commandConfidence, coordinationBurden,
  nationalPosture, ministryInteraction, coordinationLoad,
  fieldDeployment, FIELD_STAGES, nationalSociety,
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
    expect(g.pIdx).toBe(pipeStage(3, 40 / (g.behavior.auth * nationalPosture(5).authThreshold * (1 + g.fatigue / 240)), true));
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

  it('command cognition: attention triage, fatigue, confidence, burden', () => {
    for (const e of [0, 6, 18]) {
      const f = institutionalFatigue('HEALTH', e);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(100);
    }
    expect(institutionalFatigue('HEALTH', 9)).toEqual(institutionalFatigue('HEALTH', 9));

    // a national-critical cascading event outranks a minor isolated one
    const big = attentionWeight(3, 3, 4, 50, false, 70);
    const small = attentionWeight(1, 0, 0, 4, true, 20);
    expect(big).toBeGreaterThan(small);

    // confidence degrades when unacknowledged & telecom poor
    const sure = commandConfidence(true, 5, 98, 20, 5);
    const shaky = commandConfidence(false, 50, 60, 80, 70);
    expect(sure.pct).toBeGreaterThan(shaky.pct);
    expect(['verified', 'probable', 'uncertain', 'contested']).toContain(shaky.label);

    // more cascade hops + weaker telecom => heavier coordination burden
    expect(coordinationBurden(3, 60, 70)).toBeGreaterThan(coordinationBurden(0, 98, 20));

    const g = governIncident({
      archetype: 'ENERGY', severity: 'sev1' as const, ageM: 30, ack: false,
      epoch: 7, ministryId: 'M-EN', prop: 50, contention: 60, telecom: 70, reservesHeadroom: 35,
    });
    expect(g.attention).toBeGreaterThanOrEqual(0);
    expect(g.attention).toBeLessThanOrEqual(100);
    expect(g.confidence).toBeGreaterThanOrEqual(20);
    expect(typeof g.confLabel).toBe('string');
    expect(g.burden).toBeGreaterThanOrEqual(0);
  });

  it('strategic posture is deterministic, bounded and drifts doctrine', () => {
    const p = nationalPosture(12);
    expect(p).toEqual(nationalPosture(12));
    for (const k of ['deploymentConservatism', 'containmentWeight', 'stabilizationCaution', 'execConfidence', 'coordinationCaution', 'geopolitical'] as const) {
      expect(p[k]).toBeGreaterThanOrEqual(0);
      expect(p[k]).toBeLessThanOrEqual(100);
    }
    expect(p.authThreshold).toBeGreaterThanOrEqual(0.55);
    expect(p.authThreshold).toBeLessThanOrEqual(1.7);
    expect(['STRAINED', 'CONSERVATIVE', 'HARDENED', 'CAUTIOUS-RECOVERY', 'ADAPTIVE-STABLE', 'BALANCED']).toContain(p.label);

    // posture changes the governed outcome (doctrine drift is wired in)
    const base = governIncident({
      archetype: 'ENERGY', severity: 'sev2' as const, ageM: 40, ack: true, epoch: 9,
      ministryId: 'M-EN', prop: 50, contention: 50, telecom: 85, reservesHeadroom: 40,
    });
    const conservative = governIncident({
      archetype: 'ENERGY', severity: 'sev2' as const, ageM: 40, ack: true, epoch: 9,
      ministryId: 'M-EN', prop: 50, contention: 50, telecom: 85, reservesHeadroom: 40,
      posture: { ...nationalPosture(9), authThreshold: 1.7, execConfidence: 20, coordinationCaution: 80 },
    });
    expect(conservative.pIdx).toBeLessThanOrEqual(base.pIdx);
    expect(conservative.confidence).toBeLessThan(base.confidence);
  });

  it('inter-ministerial interaction & coordination load behave institutionally', () => {
    const slack = nationalOperatingState(50, 25, 30, 0, 1, 3);
    const strained = nationalOperatingState(50, 95, 98, 6, 9, 3);
    const pCalm = nationalPosture(2);
    const pHard = { ...nationalPosture(2), deploymentConservatism: 90, execConfidence: 20 };

    const easy = ministryInteraction('HEALTH', 40, slack, pCalm, 3);
    const hard = ministryInteraction('HEALTH', 90, strained, pHard, 3);
    expect(easy).toEqual(ministryInteraction('HEALTH', 40, slack, pCalm, 3));
    expect(['concurred', 'conditional', 'delayed', 'resisted']).toContain(hard.stance);
    expect(['ok', 'warn', 'alert', 'neutral']).toContain(hard.stanceTone);
    expect(typeof easy.ask).toBe('string');
    expect(easy.counterpart.length).toBeGreaterThan(0);
    // a strained, conservative state yields more institutional friction
    const rank = { concurred: 0, conditional: 1, delayed: 2, resisted: 3 } as const;
    expect(rank[hard.stance as keyof typeof rank]).toBeGreaterThanOrEqual(rank[easy.stance as keyof typeof rank]);

    const lo = coordinationLoad(3, slack, pCalm, 0);
    const hi = coordinationLoad(11, strained, pHard, 5);
    expect(hi).toBeGreaterThan(lo);
    expect(hi).toBeLessThanOrEqual(100);
  });

  it('field operations trail authorization and vary by region/strain', () => {
    const p = nationalPosture(4);
    // pre-authorization (pipeline stage < 4) => not yet released
    const pre = fieldDeployment('M-H', 2, 3, 95, 40, 60, 30, p, 10, 4);
    expect(pre.fIdx).toBe(-1);
    expect(pre.stage).toBe('AWAITING AUTHORIZATION');

    // released & deterministic
    const a = fieldDeployment('M-H', 6, 3, 95, 40, 60, 30, p, 10, 4);
    expect(a).toEqual(fieldDeployment('M-H', 6, 3, 95, 40, 60, 30, p, 10, 4));
    expect(a.fIdx).toBeGreaterThanOrEqual(0);
    expect(FIELD_STAGES).toContain(a.stage as typeof FIELD_STAGES[number]);
    expect(a.velocity).toBeGreaterThanOrEqual(6);
    expect(a.velocity).toBeLessThanOrEqual(99);

    // strained theatre executes slower than a clear one
    const clear = fieldDeployment('M-H', 6, 3, 98, 30, 70, 20, p, 5, 4).velocity;
    const strained = fieldDeployment('M-H', 6, 3, 55, 90, 20, 90, p, 80, 4).velocity;
    expect(strained).toBeLessThan(clear);

    const g = governIncident({
      archetype: 'HEALTH', severity: 'sev1' as const, ageM: 60, ack: true, epoch: 4,
      ministryId: 'M-H', prop: 60, contention: 50, telecom: 85, reservesHeadroom: 40,
      transportUtil: 70,
    });
    expect(typeof g.field.region).toBe('string');
    expect(['ok', 'warn', 'alert', 'neutral']).toContain(g.field.frictionTone);
  });

  it('national society couples to operational reality, bounded & deterministic', () => {
    const calmS = nationalOperatingState(40, 22, 28, 0, 1, 4);
    const hardS = nationalOperatingState(40, 96, 98, 6, 9, 4);
    const pCalm = nationalPosture(4);
    const pHard = { ...nationalPosture(4), execConfidence: 18, containmentWeight: 85, stabilizationCaution: 80 };

    const a = nationalSociety(calmS, pCalm, 1, 0, 4);
    expect(a).toEqual(nationalSociety(calmS, pCalm, 1, 0, 4));
    for (const k of ['civilianConfidence', 'publicOrder', 'institutionalTrust', 'economicContinuity', 'socialStrain', 'recoveryLag', 'continuityPressure'] as const) {
      expect(a[k]).toBeGreaterThanOrEqual(0);
      expect(a[k]).toBeLessThanOrEqual(100);
    }
    expect(['COHESIVE', 'STRAINED', 'FRAGILE', 'ERODING']).toContain(a.label);

    // a strained nation under crises has weaker confidence & higher strain
    const b = nationalSociety(hardS, pHard, 8, 6, 4);
    expect(b.civilianConfidence).toBeLessThan(a.civilianConfidence);
    expect(b.socialStrain).toBeGreaterThan(a.socialStrain);
    expect(b.continuityPressure).toBeGreaterThan(a.continuityPressure);
  });
});
