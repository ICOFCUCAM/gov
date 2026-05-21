import { describe, it, expect } from 'vitest';
import { nocBoard, NOC_SAFEGUARDS } from './noc-engine';

describe('nocBoard', () => {
  it('is deterministic per operational epoch', () => {
    const a = nocBoard(1_700_000_000_000);
    const b = nocBoard(1_700_000_000_000);
    expect(a).toEqual(b);
  });

  it('emits a posture per ministry, one per documented ministry', () => {
    const b = nocBoard(1_700_000_000_000);
    expect(b.ministries).toHaveLength(15);
  });

  it('every ministry operational score is within [0,100] and posture matches the threshold', () => {
    const b = nocBoard(1_700_000_000_000);
    for (const m of b.ministries) {
      expect(m.operational).toBeGreaterThanOrEqual(0);
      expect(m.operational).toBeLessThanOrEqual(100);
      if (m.operational >= 85) expect(m.posture).toBe('steady');
      else if (m.operational >= 70) expect(m.posture).toBe('elevated');
      else expect(m.posture).toBe('crisis');
    }
  });

  it('declares 8 incidents and 6 cross-cutting decisions', () => {
    const b = nocBoard(1_700_000_000_000);
    expect(b.incidents).toHaveLength(8);
    expect(b.decisions).toHaveLength(6);
  });

  it('every decision exposes its rationale publicly per safeguard', () => {
    const b = nocBoard(1_700_000_000_000);
    for (const d of b.decisions) {
      expect(d.rationalePublic).toBe(true);
    }
  });

  it('posture escalates with major/national incidents', () => {
    const b = nocBoard(1_700_000_000_000);
    const major = b.incidents.filter(i => i.severity === 'major' || i.severity === 'national').length;
    if (major >= 3) expect(b.posture).toBe('national-emergency');
    else if (major >= 2) expect(b.posture).toBe('crisis');
    else if (major >= 1) expect(b.posture).toBe('elevated');
    else expect(b.posture).toBe('steady');
  });

  it('exposes the constitutional safeguards verbatim', () => {
    expect(NOC_SAFEGUARDS.civilianCommand).toBe(true);
    expect(NOC_SAFEGUARDS.rolesNeverFused).toBe(true);
    expect(NOC_SAFEGUARDS.prohibited).toContain('unilateral-deployment-orders');
  });
});
