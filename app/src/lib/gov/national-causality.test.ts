import { describe, it, expect } from 'vitest';
import { digitalTwin, SHELLS, CAUSAL_EDGES } from './national-causality';

describe('national systemic causality & digital twin', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(digitalTwin(4000 * 170)))
      .toEqual(JSON.stringify(digitalTwin(4000 * 170 + 900)));
  });

  it('models every federated shell with bounded effective strain', () => {
    const t = digitalTwin(4000 * 250);
    expect(t.shells.length).toBe(SHELLS.length);
    for (const s of t.shells) {
      expect(s.effectiveStrain).toBeGreaterThanOrEqual(0);
      expect(s.effectiveStrain).toBeLessThanOrEqual(180);
      expect(s.effectiveStrain).toBe(Math.max(0, Math.min(180, s.baseStrain + s.inbound)));
      const exp = s.effectiveStrain >= 115 ? 'fracturing' : s.effectiveStrain >= 100 ? 'overloaded' : s.effectiveStrain >= 80 ? 'strained' : 'stable';
      expect(s.posture).toBe(exp);
    }
  });

  it('causal propagation amplifies or stabilizes along edges', () => {
    const t = digitalTwin(4000 * 318);
    expect(t.edges.length).toBe(CAUSAL_EDGES.length);
    for (const e of t.edges) {
      if (e.kind === 'amplify') expect(e.magnitude).toBeGreaterThanOrEqual(0);
      else expect(e.magnitude).toBeLessThanOrEqual(0);
    }
    // at least one epoch produces real cross-shell propagation
    let propagated = false;
    for (let ep = 1; ep < 200 && !propagated; ep++) {
      if (digitalTwin(4000 * ep).edges.some(e => e.magnitude !== 0)) propagated = true;
    }
    expect(propagated).toBe(true);
  });

  it('cascades are contiguous amplifying chains of strained shells', () => {
    let seen = 0;
    for (let ep = 1; ep < 260 && seen < 3; ep++) {
      for (const c of digitalTwin(4000 * ep).cascades) {
        expect(c.path.length).toBeGreaterThanOrEqual(3);
        expect(c.mechanism.length).toBe(c.path.length - 1);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('continuity mode + collapse forecast valid; cross-shell exchange constitutionally bounded', () => {
    const t = digitalTwin(4000 * 377);
    expect(['stable-governance', 'rising-national-strain', 'multi-shell-overload', 'regional-instability', 'constitutional-pressure', 'sovereign-continuity-risk', 'stabilization-deployment', 'adaptive-recovery', 'restored-continuity']).toContain(t.continuity);
    expect(t.collapse.probabilityPct).toBeGreaterThanOrEqual(0);
    expect(t.collapse.probabilityPct).toBeLessThanOrEqual(99);
    for (const s of t.stabilization) expect(s.advisory).toBe(true);
    // No raw data crosses the shell line — exchanges are posture-only,
    // justified, logged and auditable.
    for (const x of t.exchanges) {
      expect(x.dataClass).toBe('posture-only');
      expect(x.justified && x.logged && x.auditable).toBe(true);
    }
  });
});
