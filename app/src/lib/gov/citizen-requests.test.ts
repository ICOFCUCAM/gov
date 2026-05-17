import { describe, it, expect } from 'vitest';
import { citizenRequests, citizenLoad } from './citizen-requests';

describe('citizen–state interaction lifecycle', () => {
  it('models a deterministic, bounded request population with routing', () => {
    const a = citizenRequests(50);
    expect(a).toEqual(citizenRequests(50));
    expect(a.requests.length).toBe(16);
    expect(a.open + a.resolved).toBe(a.requests.length - a.escalated > 0 ? a.requests.length - 0 : a.requests.length); // open counts non-resolved incl escalated
    expect(a.slaMetPct).toBeGreaterThanOrEqual(0);
    expect(a.slaMetPct).toBeLessThanOrEqual(100);
    for (const r of a.requests) {
      expect(['submitted', 'routed', 'in-process', 'resolved', 'escalated']).toContain(r.stage);
      expect(r.breaching).toBe(r.stage !== 'resolved' && r.ageHrs > r.slaHrs);
    }
    for (let i = 1; i < a.byTarget.length; i++) expect(a.byTarget[i - 1]!.inbound).toBeGreaterThanOrEqual(a.byTarget[i]!.inbound);
  });

  it('citizen load is a bounded per-archetype propagation signal', () => {
    for (const t of [10, 90, 300]) {
      const v = citizenLoad('HEALTH', t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(citizenLoad('FINANCE', 77)).toBe(citizenLoad('FINANCE', 77));
  });

  it('requests progress over time', () => {
    const t0 = citizenRequests(0);
    const t1 = citizenRequests(400);
    expect(t0.requests.some((r, i) => r.stage !== t1.requests[i]!.stage)).toBe(true);
  });
});
