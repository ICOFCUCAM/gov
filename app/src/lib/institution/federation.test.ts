import { describe, it, expect } from 'vitest';
import { federationSeed, federationId, resolveInstitution } from './federation';
import { blueprintFor } from './blueprint';

describe('canonical sovereign federation', () => {
  it('seeds a stable, deterministic, all-active institution set', () => {
    const a = federationSeed();
    const b = federationSeed();
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(11);
    expect(a.every(m => m.status === 'active')).toBe(true);
    expect(a.every(m => m.id === federationId(m.slug))).toBe(true);
    // Health is the template and present.
    const health = a.find(m => m.slug === 'health')!;
    expect(health.archetype).toBe('HEALTH');
    expect(health.departments.length).toBeGreaterThan(5);
    // Ids are unique.
    expect(new Set(a.map(m => m.id)).size).toBe(a.length);
  });

  it('resolves an institution by id or slug without a network call', () => {
    expect(resolveInstitution('min-health').slug).toBe('health');
    expect(resolveInstitution('health').slug).toBe('health');
    expect(resolveInstitution('treasury').archetype).toBe('FINANCE');
  });

  it('an unknown id falls back to the Health template — never blank', () => {
    const r = resolveInstitution('totally-unknown-xyz');
    expect(r).toBeTruthy();
    expect(r.archetype).toBe('HEALTH');
  });

  // Regression guard for the fake-federation class of bug: every seeded
  // institution MUST have a real archetype topology behind it, so every
  // /ministries/<id>/system/<group> route resolves to an operational
  // surface (no empty store, no group without a blueprint).
  it('every seeded institution has a non-empty blueprint topology', () => {
    for (const m of federationSeed()) {
      const groups = blueprintFor(m.archetype);
      expect(groups.length).toBeGreaterThan(0);
      expect(groups.some(g => g.key === 'command')).toBe(true);
      // departments are instantiated from the blueprint groups
      expect(m.departments.length).toBe(groups.length);
      for (const g of groups) {
        expect(g.key).toMatch(/^[a-z-]+$/);
        expect(g.systems.length).toBeGreaterThan(0);
      }
    }
  });
});
