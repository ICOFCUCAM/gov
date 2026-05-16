import { describe, it, expect } from 'vitest';
import { judicialState, CASE_STAGES } from './judicial-engine';

describe('live judicial engine', () => {
  it('is a deterministic, bounded case-processing state machine', () => {
    const a = judicialState(60);
    const b = judicialState(60);
    expect(a).toEqual(b);
    expect(a.cases.length).toBeGreaterThan(8);
    for (const c of a.cases) {
      expect(CASE_STAGES).toContain(c.stage);
      expect(c.progressPct).toBeGreaterThanOrEqual(0);
      expect(c.progressPct).toBeLessThanOrEqual(100);
    }
    expect(a.tiers.length).toBe(4);
    for (const tr of a.tiers) {
      expect(tr.clearancePct).toBeGreaterThanOrEqual(0);
      expect(tr.clearancePct).toBeLessThanOrEqual(100);
      expect(['ok', 'warn', 'alert']).toContain(tr.tone);
      expect(tr.backlog).toBeGreaterThanOrEqual(0);
    }
    expect(a.meanClearance).toBeGreaterThanOrEqual(0);
    expect(a.meanClearance).toBeLessThanOrEqual(100);
  });

  it('cases progress over time', () => {
    const t0 = judicialState(0);
    const t1 = judicialState(500);
    expect(t0.cases.some((c, i) => c.stage !== t1.cases[i]!.stage || c.progressPct !== t1.cases[i]!.progressPct)).toBe(true);
  });

  it('produces coherent judicial signals and regional analytics', () => {
    const s = judicialState(120);
    expect(s.signals.length).toBeGreaterThan(0);
    for (const sig of s.signals) expect(['info', 'watch', 'risk']).toContain(sig.level);
    expect(s.regional.length).toBe(6);
    for (const r of s.regional) {
      expect(r.clearancePct).toBeGreaterThanOrEqual(0);
      expect(r.backlog).toBeGreaterThanOrEqual(0);
    }
    expect(s.totalBacklog).toBe(s.tiers.reduce((a, x) => a + x.backlog, 0));
  });
});
