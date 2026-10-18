import { describe, expect, it } from 'vitest';
import { analyseFrontier } from './frontier';
import type { NationGeography } from '@/lib/map/geography';
import type { WorldModel } from '@/lib/map/world';

// A unit square with corners every 0.25° (shared borders share vertices, as boundary files do),
// wound clockwise as d3 reads spherical polygons.
const square = (x0: number, y0: number, s = 1) => {
  const pts: number[][] = [];
  const step = 0.25;
  for (let t = 0; t < s; t += step) pts.push([x0 + t, y0]);
  for (let t = 0; t < s; t += step) pts.push([x0 + s, y0 + t]);
  for (let t = 0; t < s; t += step) pts.push([x0 + s - t, y0 + s]);
  for (let t = 0; t < s; t += step) pts.push([x0, y0 + s - t]);
  pts.push([x0, y0]);
  return { type: 'Polygon' as const, coordinates: [pts.reverse()] };
};

describe('frontier', () => {
  // The nation: West and East side by side; a neighbour touches West only; the sea lies around the rest.
  const geo: NationGeography = {
    iso3: 'TST', name: 'Testland', noun: 'region', credit: '', context: [],
    units: [{ name: 'West', geometry: square(10, 0) }, { name: 'East', geometry: square(11, 0) }],
  };
  const world: WorldModel = {
    countries: [
      { id: '1', name: 'Testland', geometry: { type: 'Polygon', coordinates: [[[10, 0], [10, 1], [12, 1], [12, 0], [10, 0]]] } },
      { id: '2', name: 'Neighbouria', geometry: square(9, 0) },
    ],
    neighbours: [[1], [0]],
  };

  it('puts each neighbour at the region that shares its border', () => {
    const f = analyseFrontier(geo, world);
    expect(f.home).toBe(0);
    expect(f.neighbours.map(n => [n.name, n.region])).toEqual([['Neighbouria', 'West']]);
    expect(f.neighbours[0]!.at[0]).toBeCloseTo(10, 5);
  });

  it('finds the coast on outlines shared with neither a neighbour nor another region', () => {
    const f = analyseFrontier(geo, world);
    expect(f.coastal[0]?.region).toBe('East');
    expect(f.coastal.find(c => c.region === 'East')!.share).toBeGreaterThan(f.coastal.find(c => c.region === 'West')?.share ?? 0);
  });

  it('returns nothing for a nation it cannot find in the world', () => {
    const f = analyseFrontier({ ...geo, units: [{ name: 'Far', geometry: square(100, 50) }] }, world);
    expect(f.neighbours).toEqual([]);
    expect(f.coastal).toEqual([]);
  });
});
