import { describe, it, expect } from 'vitest';
import { observabilityLedger, controlBoard, AGENCIES } from './sovereign-observability';

describe('sovereign observability runtime', () => {
  it('is deterministic for a given operational epoch', () => {
    const a = observabilityLedger(4000 * 100);
    const b = observabilityLedger(4000 * 100 + 999); // same epoch (floor)
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it('every transaction is fully observable & deadline-governed', () => {
    for (const t of observabilityLedger(4000 * 250)) {
      expect(t.id.length).toBeGreaterThan(0);
      expect(AGENCIES).toContain(t.agency);
      expect(t.officer.length).toBeGreaterThan(0);
      expect(t.slaHrs).toBeGreaterThan(0);
      expect(t.legalDeadlineHrs).toBeGreaterThanOrEqual(t.slaHrs);
      expect(t.corruptionRisk).toBeGreaterThanOrEqual(0);
      expect(t.corruptionRisk).toBeLessThanOrEqual(100);
      // Deadline state must agree with age vs thresholds.
      if (t.ageHrs > t.legalDeadlineHrs) expect(t.escalation).toBe('breach');
      else if (t.ageHrs > t.slaHrs) expect(t.escalation).toBe('watch');
      else expect(t.escalation).toBe('nominal');
    }
  });

  it('a past-legal-deadline non-advancing file is a constitutional breach with risk', () => {
    let checked = 0;
    for (let e = 1; e < 400; e++) {
      for (const t of observabilityLedger(4000 * e)) {
        const stalledEarly = t.stage === 'captured' || t.stage === 'validated';
        if (t.ageHrs > t.legalDeadlineHrs && stalledEarly) {
          expect(t.constitutional).toBe('breach');
          expect(t.riskFlags).toContain('invisible-delay');
          expect(t.corruptionRisk).toBeGreaterThan(40);
          checked++;
        }
      }
      if (checked > 5) break;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('control board aggregates are internally consistent', () => {
    const b = controlBoard(4000 * 321);
    expect(b.total).toBeGreaterThan(0);
    expect(b.delayed).toBeLessThanOrEqual(b.total);
    expect(b.breached).toBeLessThanOrEqual(b.delayed);
    expect(b.agencies.length).toBe(AGENCIES.length);
    expect(b.regionHeat.length).toBeGreaterThan(0);
    expect(b.watchlist.length).toBeLessThanOrEqual(12);
    // Agencies sorted worst-first (breaches desc, then mean risk desc).
    for (let i = 1; i < b.agencies.length; i++) {
      const p = b.agencies[i - 1]!, c = b.agencies[i]!;
      expect(p.breached > c.breached || (p.breached === c.breached && p.meanRisk >= c.meanRisk)).toBe(true);
    }
  });
});
