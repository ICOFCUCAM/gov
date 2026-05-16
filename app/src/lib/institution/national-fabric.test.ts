import { describe, it, expect } from 'vitest';
import { buildNationalFabric } from './national-fabric';
import type { Ministry } from '@/lib/api/types';

const mk = (id: string, archetype: Ministry['archetype'], status: Ministry['status'] = 'active'): Ministry => ({
  id, slug: id, name: `${archetype} Ministry`, archetype, status,
  createdAt: '2026-01-01T00:00:00Z', departments: [], modules: [],
});

describe('national interoperability fabric', () => {
  it('only meshes active institutions and wires their dependencies', () => {
    const f = buildNationalFabric([mk('h', 'HEALTH'), mk('t', 'TRANSPORT'), mk('x', 'ENERGY', 'deactivated')]);
    expect(f.stats.institutions).toBe(2);
    expect(f.edges.length).toBeGreaterThan(0);
    // Health↔Transport resolves to the real Transport institution
    expect(f.edges.some(e => e.fromId === 'h' && e.toId === 't')).toBe(true);
  });

  it('emits external capability nodes when a dependency archetype is absent', () => {
    const f = buildNationalFabric([mk('h', 'HEALTH')]);
    expect(f.nodes.some(n => n.external)).toBe(true);
    expect(f.edges.every(e => e.fromId === 'h')).toBe(true);
  });

  it('ranks systemic institutions by inbound dependency pressure', () => {
    const f = buildNationalFabric([mk('h', 'HEALTH'), mk('t', 'TRANSPORT'), mk('f', 'FINANCE'), mk('i', 'INTERIOR')]);
    expect(f.systemic.length).toBeGreaterThan(0);
    expect(f.systemic[0]!.inbound).toBeGreaterThanOrEqual(f.systemic[f.systemic.length - 1]!.inbound);
  });

  it('is deterministic and stats are coherent', () => {
    const a = buildNationalFabric([mk('h', 'HEALTH'), mk('f', 'FINANCE')]);
    const b = buildNationalFabric([mk('h', 'HEALTH'), mk('f', 'FINANCE')]);
    expect(a).toEqual(b);
    expect(a.stats.mutual + a.stats.consumes + a.stats.provides).toBe(a.edges.length);
  });

  it('handles an empty state', () => {
    const f = buildNationalFabric([]);
    expect(f.stats.institutions).toBe(0);
    expect(f.edges).toEqual([]);
  });
});
