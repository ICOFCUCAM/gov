import { describe, it, expect } from 'vitest';
import { ministryFabric, ministryLayers, ministryDependencies } from './ministry-fabric';
import type { Ministry } from '@/lib/api/types';

const m = (over: Partial<Ministry>): Ministry => ({
  id: 'MIN-1', slug: 's', name: 'N', archetype: 'HEALTH', status: 'active',
  createdAt: '2026-01-01T00:00:00Z', departments: [], modules: [], ...over,
});

describe('ministry factory fabric', () => {
  it('every ministry inherits the six-layer ecosystem', () => {
    const layers = ministryLayers();
    expect(layers.map(l => l.key)).toEqual(['executive', 'operational', 'intelligence', 'public', 'institutional', 'infrastructure']);
    for (const l of layers) expect(l.modules.length).toBeGreaterThanOrEqual(5);
  });

  it('composes national/regional/local tiers from archetype footprint', () => {
    const f = ministryFabric(m({ archetype: 'HEALTH' }));
    expect(f.tiers.map(t => t.tier)).toEqual(['National Command', 'Regional Command', 'Local Operations']);
    expect(f.tiers[0]!.units).toBe(1);
    expect(f.tiers[2]!.units).toBeGreaterThan(f.tiers[1]!.units);
    expect(f.layersProvisioned).toBe(6);
  });

  it('is dependency-aware (Health consumes Finance, mutual with Transport)', () => {
    const d = ministryDependencies('HEALTH');
    expect(d.some(x => x.archetype === 'FINANCE' && x.direction === 'consumes')).toBe(true);
    expect(d.some(x => x.archetype === 'TRANSPORT' && x.direction === 'mutual')).toBe(true);
  });

  it('unknown archetype still gets a sane dependency set', () => {
    const d = ministryDependencies('GENERIC');
    expect(d.length).toBeGreaterThanOrEqual(3);
  });

  it('tiers are deterministic per institution', () => {
    expect(ministryFabric(m({ id: 'X' })).tiers).toEqual(ministryFabric(m({ id: 'X' })).tiers);
  });
});
