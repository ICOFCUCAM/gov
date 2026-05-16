import { describe, it, expect } from 'vitest';
import { ministryAppManifest, STANDING_APPS, BRANCH_APPS } from './manifests';

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
});
