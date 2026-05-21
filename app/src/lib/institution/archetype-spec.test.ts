import { describe, it, expect } from 'vitest';
import { specFor } from './archetype-spec';
import type { ArchetypeKey } from '@/lib/api/types';

describe('archetype-spec specFor', () => {
  it('returns the documented Health requirements', () => {
    const s = specFor('HEALTH');
    expect(s.requiredDepartments).toBe(4);
    expect(s.requiredModules).toBe(6);
  });

  it('falls back to GENERIC for unknown archetypes', () => {
    const generic = specFor('GENERIC');
    const unknown = specFor('TOTALLY_UNKNOWN' as ArchetypeKey);
    expect(unknown.requiredDepartments).toBe(generic.requiredDepartments);
    expect(unknown.requiredModules).toBe(generic.requiredModules);
  });

  it('every archetype emits the same standard surfaces and capabilities', () => {
    const a = specFor('HEALTH');
    const b = specFor('FINANCE');
    expect(a.surfaces).toEqual(b.surfaces);
    expect(a.capabilities).toEqual(b.capabilities);
  });

  it('emits non-empty surfaces and capabilities', () => {
    const s = specFor('FINANCE');
    expect(s.surfaces.length).toBeGreaterThan(0);
    expect(s.capabilities.length).toBeGreaterThan(0);
  });
});
