import { describe, it, expect } from 'vitest';
import { industrialContinuityBoard } from './industrial-continuity';

describe('industrial continuity & strategic production engine', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(industrialContinuityBoard(4000 * 260)))
      .toEqual(JSON.stringify(industrialContinuityBoard(4000 * 260 + 1400)));
  });

  it('industrial posture is consistent with halted clusters and output continuity', () => {
    const b = industrialContinuityBoard(4000 * 322);
    const halted = b.command.clusters.filter(c => c.status === 'halted').length;
    const out = b.command.outputContinuityIdx;
    if (halted >= 3 || out < 45) expect(b.command.posture).toBe('industrial-crisis');
    else if (halted >= 1 || out < 60) expect(b.command.posture).toBe('contraction');
    else if (out < 72) expect(b.command.posture).toBe('pressured');
    else if (out < 84) expect(b.command.posture).toBe('engaged');
    else expect(b.command.posture).toBe('productive');
  });

  it('factory clusters always carry utilisation no greater than capacity', () => {
    for (const c of industrialContinuityBoard(4000 * 411).command.clusters) {
      expect(c.utilisationPct).toBeLessThanOrEqual(c.capacityPct);
      expect(c.shiftsRunning).toBeGreaterThanOrEqual(1);
      expect(c.shiftsRunning).toBeLessThanOrEqual(3);
    }
  });

  it('all trade corridors carry a valid mode and status', () => {
    for (const co of industrialContinuityBoard(4000 * 277).corridors) {
      expect(['maritime', 'rail', 'road', 'air']).toContain(co.mode);
      expect(['open', 'restricted', 'congested', 'closed']).toContain(co.status);
      expect(co.tariffPressurePct).toBeGreaterThanOrEqual(0);
      expect(co.tariffPressurePct).toBeLessThanOrEqual(100);
    }
  });

  it('strategic industries with rationed risk have reroute active', () => {
    for (const s of industrialContinuityBoard(4000 * 499).strategicIndustries) {
      if (s.riskClass === 'rationed') expect(s.rerouteActive).toBe(true);
      expect(['sovereign', 'critical', 'standard']).toContain(s.allocationPriority);
    }
  });

  it('every incident propagates with valid status states', () => {
    for (const i of industrialContinuityBoard(4000 * 533).incidents) {
      expect(i.ministryCascade.length).toBeGreaterThan(0);
      expect(['advisory', 'elevated', 'critical', 'national']).toContain(i.severity);
      expect(['emergency-mobilisation', 'alternative-routing', 'strategic-reserve-draw', 'partner-substitution']).toContain(i.recoveryPathway);
      for (const c of i.ministryCascade) {
        expect(['pending', 'engaged', 'cleared']).toContain(c.status);
      }
    }
  });

  it('export dependencies sorted by share descending; risk reflects share', () => {
    const deps = industrialContinuityBoard(4000 * 244).foreign.exportDependencies;
    for (let i = 1; i < deps.length; i++) {
      expect(deps[i - 1]!.sharePct).toBeGreaterThanOrEqual(deps[i]!.sharePct);
    }
    for (const d of deps) {
      if (d.sharePct >= 22) expect(d.risk).toBe('concentration');
      else if (d.sharePct >= 14) expect(d.risk).toBe('moderate');
      else expect(d.risk).toBe('low');
    }
  });

  it('forecast horizon arrays aligned at 4 horizon points; survivability composite is in range', () => {
    const f = industrialContinuityBoard(4000 * 305).forecast;
    expect(f.horizonYears.length).toBe(4);
    expect(f.industrialOutputTrajectory.length).toBe(4);
    expect(f.exportCapacityTrajectory.length).toBe(4);
    expect(f.manufacturingCapacityTrajectory.length).toBe(4);
    expect(f.strategicAutonomyTrajectory.length).toBe(4);
    expect(f.industrialSurvivabilityIdx).toBeGreaterThanOrEqual(0);
    expect(f.industrialSurvivabilityIdx).toBeLessThanOrEqual(100);
    expect(f.systemicEconomicRisk).toBeGreaterThanOrEqual(0);
    expect(f.systemicEconomicRisk).toBeLessThanOrEqual(100);
  });
});
