import { describe, it, expect } from 'vitest';
import { federationSeed, federationId, resolveInstitution } from './federation';

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
});
