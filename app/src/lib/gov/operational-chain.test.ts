import { describe, it, expect } from 'vitest';
import { buildOperationalChain, recoveryWorkflow } from './operational-chain';
import type { Ministry } from '@/lib/api/types';

const mk = (id: string, name: string, archetype: Ministry['archetype']): Ministry =>
  ({ id, name, slug: id.toLowerCase(), archetype, status: 'active', createdAt: '2026-01-01T00:00:00Z', departments: [], modules: [] });

const MINS: Ministry[] = [
  mk('H', 'Ministry of Health', 'HEALTH'),
  mk('F', 'Treasury', 'FINANCE'),
  mk('T', 'Ministry of Transport', 'TRANSPORT'),
  mk('E', 'Ministry of Energy', 'ENERGY'),
  mk('I', 'Ministry of Interior', 'INTERIOR'),
];

describe('operational chain simulation', () => {
  it('returns null with no active institutions', () => {
    expect(buildOperationalChain([], null, 10)).toBeNull();
    expect(buildOperationalChain(MINS.map(m => ({ ...m, status: 'deactivated' as const })), null, 10)).toBeNull();
  });

  it('builds a deterministic, bounded, six-stage chain from a chosen origin', () => {
    const a = buildOperationalChain(MINS, 'E', 50)!;
    const b = buildOperationalChain(MINS, 'E', 50)!;
    expect(a).toEqual(b);
    expect(a.origin.id).toBe('E');
    expect(a.stages.map(s => s.key)).toEqual(['trigger', 'dependency', 'escalation', 'treasury', 'citizen', 'recovery']);
    expect(a.originSeverity).toBeGreaterThanOrEqual(45);
    expect(a.originSeverity).toBeLessThanOrEqual(100);
    expect(a.totalAffected).toBeGreaterThanOrEqual(1);
    expect(a.treasuryImpactPct).toBeLessThanOrEqual(0);
    expect(['contained', 'spreading', 'critical']).toContain(a.containment);
    for (const s of a.stages) {
      expect(s.severity).toBeGreaterThanOrEqual(0);
      expect(s.severity).toBeLessThanOrEqual(100);
      expect(['ok', 'warn', 'alert']).toContain(s.tone);
    }
    // recovery is the last (largest tPlusMin)
    expect(a.stages.at(-1)!.tPlusMin).toBe(a.recoveryMins);
  });

  it('auto-selects the most-stressed origin when none is given', () => {
    const c = buildOperationalChain(MINS, null, 33)!;
    expect(MINS.some(m => m.id === c.origin.id)).toBe(true);
    expect(c.stages[0]!.impacts[0]!.instId).toBe(c.origin.id);
  });

  it('recoveryWorkflow is ordered, bounded, and converges within the chain ETA', () => {
    const chain = buildOperationalChain(MINS, 'F', 70)!;
    const wf = recoveryWorkflow(chain);
    expect(wf.length).toBeGreaterThan(0);
    for (let i = 1; i < wf.length; i++) {
      expect(wf[i]!.order).toBe(wf[i - 1]!.order + 1);
      expect(wf[i]!.etaMin).toBeGreaterThanOrEqual(wf[i - 1]!.etaMin);
    }
    expect(wf.at(-1)!.etaMin).toBe(chain.recoveryMins);
    expect(wf.reduce((a, s) => a + s.restores, 0)).toBeGreaterThan(0);
  });
});
