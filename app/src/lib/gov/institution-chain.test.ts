import { describe, it, expect } from 'vitest';
import {
  chainDef, facilities, actors, recordLineage, chainIntegrity, MINISTRY_CHAIN,
} from './institution-chain';

describe('institution chain', () => {
  it('every ministry resolves a chain definition', () => {
    for (const k of Object.keys(MINISTRY_CHAIN)) {
      const d = chainDef(k);
      expect(d.ministry.length).toBeGreaterThan(0);
      expect(d.facilityPrefix.length).toBeGreaterThan(0);
    }
    expect(chainDef('UNKNOWN').facilityKind).toBe('Facility');
  });

  it('facilities are deterministic, bounded and tiered', () => {
    const a = facilities('HEALTH', 7);
    expect(a).toEqual(facilities('HEALTH', 7));
    expect(a.length).toBe(6);
    expect(a[0]!.tier).toBe('tertiary');
    for (const f of a) {
      expect(f.id.startsWith('HSP-')).toBe(true);
      expect(f.load).toBeGreaterThanOrEqual(0);
      expect(f.load).toBeLessThanOrEqual(100);
      expect(f.syncPct).toBeGreaterThanOrEqual(0);
      expect(f.syncPct).toBeLessThanOrEqual(100);
      expect(['operational', 'strained', 'degraded']).toContain(f.status);
    }
  });

  it('actors enrol into a facility deterministically', () => {
    const f = facilities('HEALTH', 7)[0]!;
    const ax = actors('HEALTH', f.id, 7);
    expect(ax).toEqual(actors('HEALTH', f.id, 7));
    expect(ax.length).toBe(8);
    for (const x of ax) {
      expect(x.facilityId).toBe(f.id);
      expect(x.role).toBe('Physician');
      expect(['active', 'probation', 'suspended']).toContain(x.standing);
      expect(x.reliability).toBeGreaterThanOrEqual(0);
      expect(x.reliability).toBeLessThanOrEqual(100);
    }
  });

  it('records flow actor → facility → ministry → national', () => {
    const f = facilities('HEALTH', 7)[2]!;
    const r = recordLineage('REC-12', 'Amara Okonkwo', f, 'HEALTH', 7);
    expect(r).toEqual(recordLineage('REC-12', 'Amara Okonkwo', f, 'HEALTH', 7));
    expect(r.stages.length).toBe(5);
    expect(r.stages[0]!.tier).toBe('ACTOR');
    expect(r.stages[0]!.done).toBe(true);
    expect(r.stages[r.stages.length - 1]!.tier).toBe('NATIONAL');
    expect(['ACTOR', 'FACILITY', 'MINISTRY', 'NATIONAL']).toContain(r.current);
    // a record cannot be national-synced before facility hold
    if (r.synced) expect(r.stages[1]!.done).toBe(true);
  });

  it('chain integrity is bounded & deterministic', () => {
    const c = chainIntegrity('INTERIOR', 9);
    expect(c).toEqual(chainIntegrity('INTERIOR', 9));
    expect(c.facilities).toBe(6);
    expect(c.meanSyncPct).toBeGreaterThanOrEqual(0);
    expect(c.meanSyncPct).toBeLessThanOrEqual(100);
    expect(['synchronised', 'lagging', 'degraded']).toContain(c.status);
  });
});
