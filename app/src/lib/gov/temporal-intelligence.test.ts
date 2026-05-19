import { describe, it, expect } from 'vitest';
import { temporalBoard, seasonIntensity, SEASONS, FORECAST_HORIZON } from './temporal-intelligence';

describe('temporal sovereign intelligence', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(temporalBoard(4000 * 160)))
      .toEqual(JSON.stringify(temporalBoard(4000 * 160 + 800)));
  });

  it('seasonal intensity is bounded and periodic', () => {
    const s = SEASONS[0]!;
    for (let e = 0; e < 300; e += 7) {
      const v = seasonIntensity(s, e);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    // periodicity: one full period returns (near) the same value
    expect(Math.abs(seasonIntensity(s, 13) - seasonIntensity(s, 13 + s.periodEpochs))).toBeLessThan(1e-9);
  });

  it('produces a forward trajectory of horizon length for every agency', () => {
    const b = temporalBoard(4000 * 240);
    for (const tr of b.trajectories) {
      expect(tr.util.length).toBe(FORECAST_HORIZON + 1);
      expect(tr.backlog.length).toBe(FORECAST_HORIZON + 1);
      expect(tr.corruption.length).toBe(FORECAST_HORIZON + 1);
      expect(tr.peakUtil).toBeGreaterThanOrEqual(tr.util[0]!);
      if (tr.collapseEta !== null) {
        expect(tr.collapseEta).toBeGreaterThanOrEqual(0);
        expect(tr.collapseEta).toBeLessThanOrEqual(FORECAST_HORIZON);
        expect(tr.collapseKind).toBeTruthy();
      }
    }
  });

  it('early warnings precede collapse and carry an ETA + severity', () => {
    let seen = 0;
    for (let ep = 1; ep < 260 && seen < 3; ep++) {
      const b = temporalBoard(4000 * ep);
      for (const w of b.warnings) {
        expect(w.etaEpochs).toBeGreaterThanOrEqual(0);
        expect(['advisory', 'elevated', 'critical']).toContain(w.severity);
        expect(['overload', 'backlog', 'corruption-spike', 'staffing-exhaustion']).toContain(w.kind);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('continuity forecast + temporal resilience are valid and advisory', () => {
    const b = temporalBoard(4000 * 377);
    for (const p of [b.continuity.degradationProbPct, b.continuity.regionalCollapseProbPct, b.continuity.staffingFailureProbPct, b.continuity.emergencyEscalationProbPct]) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(99);
    }
    for (const a of b.continuity.preemptiveActions) expect(a.advisory).toBe(true);
    expect(['stable', 'rising-pressure', 'seasonal-strain', 'escalating-overload', 'continuity-risk', 'constitutional-instability', 'stabilization', 'recovery-adaptation']).toContain(b.resilience);
    expect(b.memory.recurringSeasons.length).toBeGreaterThan(0);
    expect(b.memory.recoveryEffectivenessPct).toBeGreaterThanOrEqual(20);
  });
});
