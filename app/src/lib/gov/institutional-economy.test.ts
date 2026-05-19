import { describe, it, expect } from 'vitest';
import { economyBoard } from './institutional-economy';
import { AGENCIES } from './sovereign-observability';

describe('institutional economy & national strain', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(economyBoard(4000 * 150)))
      .toEqual(JSON.stringify(economyBoard(4000 * 150 + 700)));
  });

  it('every agency is finite and bounded', () => {
    const b = economyBoard(4000 * 240);
    expect(b.agencies.length).toBe(AGENCIES.length);
    for (const a of b.agencies) {
      expect(a.capacity).toBeGreaterThan(0);
      expect(a.efficiencyPct).toBeGreaterThanOrEqual(8);
      expect(a.efficiencyPct).toBeLessThanOrEqual(100);
      expect(a.fatiguePct).toBeGreaterThanOrEqual(0);
      expect(a.fatiguePct).toBeLessThanOrEqual(100);
      expect(a.utilPct).toBeGreaterThanOrEqual(a.baseUtilPct); // inbound pressure only adds
      // overload state must agree with utilisation thresholds
      const exp = a.utilPct >= 130 ? 'saturated' : a.utilPct >= 100 ? 'overloaded' : a.utilPct >= 80 ? 'strained' : 'nominal';
      expect(a.overload).toBe(exp);
    }
  });

  it('pressure propagates: every edge magnitude is non-negative and lifts the target', () => {
    const b = economyBoard(4000 * 318);
    for (const e of b.edges) {
      expect(e.magnitude).toBeGreaterThanOrEqual(0);
      const tgt = b.agencies.find(a => a.agency === e.to)!;
      expect(tgt.inboundPressure).toBeGreaterThanOrEqual(0);
      expect(tgt.utilPct).toBe(tgt.baseUtilPct + tgt.inboundPressure);
    }
    // at least one edge carried real pressure across the mesh in some epoch
    let propagated = false;
    for (let ep = 1; ep < 200 && !propagated; ep++) {
      if (economyBoard(4000 * ep).edges.some(e => e.magnitude > 0)) propagated = true;
    }
    expect(propagated).toBe(true);
  });

  it('separates lawful overload from suspicious obstruction', () => {
    for (const a of economyBoard(4000 * 401).agencies) {
      if (a.corruption.mode === 'lawful-overload') expect(a.baseUtilPct).toBeGreaterThanOrEqual(95);
      if (a.corruption.mode === 'suspicious-obstruction') {
        expect(a.corruption.pressure).toBeGreaterThanOrEqual(30);
        expect(a.baseUtilPct).toBeLessThan(95); // delay NOT explained by load
      }
      if (a.corruption.mode === 'clean') expect(a.corruption.pressure).toBeLessThan(30);
    }
  });

  it('resilience mode is valid and stabilization is advisory only', () => {
    const b = economyBoard(4000 * 377);
    expect(['nominal', 'strained', 'overloaded', 'degraded-sync', 'regional-emergency', 'national-emergency', 'constitutional-continuity', 'recovery']).toContain(b.resilience);
    for (const s of b.stabilization) {
      expect(s.advisory).toBe(true);
      expect(['staffing-reallocation', 'workflow-rerouting', 'continuity-reserve', 'judicial-protection']).toContain(s.kind);
    }
    expect(b.regions.length).toBe(6);
    expect(b.memory.topResilientRegion.length).toBeGreaterThan(0);
  });
});
