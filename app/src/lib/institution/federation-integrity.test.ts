import { describe, it, expect } from 'vitest';
import { federationSeed } from './federation';
import { blueprintFor } from './blueprint';
import { ministryAppManifest } from '@/apps/manifests';

// Federation integrity: the seeded institution set, the blueprint topology
// and the federated app manifest must stay mutually consistent. A drift
// here is exactly the fake-federation class of defect (an institution that
// exists without a routable, differentiated operational surface), so this
// cross-check locks all three layers together.
describe('federation integrity (seed ↔ blueprint ↔ manifest)', () => {
  it('every seeded institution has a blueprint topology AND a routable manifest whose nav matches the blueprint groups', () => {
    for (const m of federationSeed()) {
      const groups = blueprintFor(m.archetype);
      expect(groups.length, `${m.archetype} has no blueprint groups`).toBeGreaterThan(0);

      const mf = ministryAppManifest({ id: m.id, name: m.name, archetype: m.archetype });
      expect(mf.kind).toBe('ministry');
      expect(mf.instanceId).toBe(m.id);
      expect(mf.domain.length).toBeGreaterThan(0);

      // The deployable-path nav must expose exactly the blueprint groups —
      // so every subsystem the institution has is reachable, and no nav
      // entry points at a group that does not exist.
      const navKeys = mf.nav.map(n => n.key).sort();
      const groupKeys = groups.map(g => g.key).sort();
      expect(navKeys).toEqual(groupKeys);

      // Departments are instantiated 1:1 from blueprint groups.
      expect(m.departments.length).toBe(groups.length);
      // A command authority always exists.
      expect(groupKeys).toContain('command');
    }
  });

  it('seeded domains are unique (no two institutions collide on a route)', () => {
    const domains = federationSeed().map(m =>
      ministryAppManifest({ id: m.id, name: m.name, archetype: m.archetype }).domain,
    );
    // GENERIC could repeat, but the canonical federation uses distinct archetypes.
    expect(new Set(domains).size).toBe(domains.length);
  });
});
