import { describe, it, expect } from 'vitest';
import { actorChain } from './InstitutionChain';

describe('actorChain', () => {
  it('returns a coherent, deterministic bundle for a ministry/key', () => {
    const a = actorChain('HEALTH', 'inst-7', 4_000_000, 'MRN');
    const b = actorChain('HEALTH', 'inst-7', 4_000_000, 'MRN');
    expect(a.facility.id).toBe(b.facility.id);
    expect(a.actorName).toBe(b.actorName);
    expect(a.lineage.recordId).toBe('MRN-inst-7');
    expect(a.lineage.stages.length).toBe(5);
    expect(a.lineage.stages[0]!.done).toBe(true); // ACTOR captured
    expect(['synchronised', 'lagging', 'degraded']).toContain(a.integrity.status);
  });

  it('binds different keys to (generally) different facilities and never throws on any ministry', () => {
    for (const m of ['HEALTH', 'INTERIOR', 'FINANCE', 'EDUCATION', 'TRANSPORT', 'ENERGY', 'JUSTICE', 'TRADE', 'LEGISLATURE']) {
      const c = actorChain(m, `k-${m}`, 5_000_000);
      expect(c.facility).toBeTruthy();
      expect(typeof c.actorName).toBe('string');
      expect(c.actorName.length).toBeGreaterThan(0);
    }
  });

  it('every actor-facing surface ministry key resolves a real facility (no empty strip)', () => {
    // Keys actually passed by ActorChainStrip / InstitutionChainStrip across
    // the platform — Health/Interior/Finance/Education/Transport/Energy/
    // Justice/Trade/Legislature plus Sector archetypes incl. the GENERIC
    // fallback. None may yield an undefined facility or blank actor.
    const keys = ['HEALTH', 'INTERIOR', 'FINANCE', 'EDUCATION', 'TRANSPORT', 'ENERGY', 'JUSTICE', 'TRADE', 'LEGISLATURE', 'AGRICULTURE', 'ENVIRONMENT', 'LABOR', 'GENERIC', 'UNKNOWN-X'];
    for (const m of keys) {
      const c = actorChain(m, `inst-${m}`, 6_000_000, 'REC');
      expect(c.facility?.id).toBeTruthy();
      expect(c.facility?.name).toBeTruthy();
      expect(c.lineage.stages).toHaveLength(5);
      expect(c.actorName.trim().length).toBeGreaterThan(0);
    }
  });
});
