import { describe, it, expect } from 'vitest';
import { ministryAppManifest, STANDING_APPS, BRANCH_APPS, AGENCY_APPS } from './manifests';

describe('federated app manifests', () => {
  it('derives ministry app nav from the blueprint factory', () => {
    const mf = ministryAppManifest({ id: 'MIN-7', name: 'Ministry of Health', archetype: 'HEALTH' });
    expect(mf.id).toBe('ministry-health');
    expect(mf.domain).toBe('health');
    expect(mf.kind).toBe('ministry');
    expect(mf.instanceId).toBe('MIN-7');
    expect(mf.nav.length).toBeGreaterThan(4);
    expect(mf.nav.some(n => /command/i.test(n.label))).toBe(true);
  });

  it('standing apps cover branches + sovereign agencies', () => {
    const ids = STANDING_APPS.map(a => a.id);
    expect(ids).toContain('judiciary');
    expect(ids).toContain('legislature');
    expect(ids).toContain('police-command');
    expect(ids).toContain('emergency-response');
    expect(ids).toContain('citizen-wallet');
    for (const b of BRANCH_APPS) expect(b.kind).toBe('branch');
    for (const a of STANDING_APPS) {
      expect(a.domain.length).toBeGreaterThan(0);
      expect(Array.isArray(a.nav)).toBe(true);
    }
  });

  it('every ministry archetype yields a unique sovereign domain', () => {
    const archetypes = ['HEALTH', 'EDUCATION', 'TRANSPORT', 'ENERGY', 'FINANCE', 'AGRICULTURE', 'JUSTICE', 'ENVIRONMENT', 'INTERIOR', 'LABOR', 'TRADE', 'GENERIC'] as const;
    const domains = archetypes.map(a => ministryAppManifest({ id: `MIN-${a}`, name: a, archetype: a }).domain);
    expect(new Set(domains).size).toBe(domains.length);
    for (const a of archetypes) {
      const mf = ministryAppManifest({ id: `MIN-${a}`, name: a, archetype: a });
      expect(mf.kind).toBe('ministry');
      expect(mf.instanceId).toBe(`MIN-${a}`);
      expect(mf.nav.length).toBeGreaterThan(0);
    }
  });

  // Regression guard for deployable-path subsystem differentiation: each
  // agency/branch app must keep multiple distinct nav domains so a change
  // that collapses one back to a single conflated surface fails CI.
  it('agency & branch apps keep multi-domain navigation', () => {
    for (const a of [...AGENCY_APPS, ...BRANCH_APPS]) {
      expect(a.nav.length, `${a.id} must expose >1 subsystem nav`).toBeGreaterThan(1);
      const keys = a.nav.map(n => n.key);
      expect(new Set(keys).size).toBe(keys.length); // unique
      for (const n of keys) expect(n).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
