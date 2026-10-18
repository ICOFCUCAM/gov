import { describe, it, expect } from 'vitest';
import { geoCentroid } from 'd3-geo';
import { loadWorld, nationIndex, findByName } from './world';
import { loadCountry } from '@/lib/geo/admin1';

describe('the nation in the world', () => {
  it('finds the nation by where it is and its neighbours by shared borders', async () => {
    const world = await loadWorld();
    expect(world.countries.length).toBeGreaterThan(230); // 1:50m: small states included
    const ken = await loadCountry('KEN');
    const shape = { type: 'MultiPolygon', coordinates: ken!.provinces.flatMap(p => (p.geometry.type === 'Polygon' ? [p.geometry.coordinates as number[][][]] : (p.geometry.coordinates as number[][][][]))) };
    const home = nationIndex(world, geoCentroid({ type: 'Feature', properties: {}, geometry: shape } as never) as [number, number]);
    expect(world.countries[home]!.name).toBe('Kenya');
    const neighbours = world.neighbours[home]!.map(i => world.countries[i]!.name).sort();
    expect(neighbours).toEqual(expect.arrayContaining(['Ethiopia', 'Somalia', 'Tanzania', 'Uganda']));
  }, 60_000);

  it('matches declared partners by everyday names, and reports those it cannot find', async () => {
    const world = await loadWorld();
    for (const n of ['United States', 'Democratic Republic of the Congo', 'United Kingdom', 'Singapore', 'Malta', "Côte d'Ivoire", 'South Sudan']) {
      expect(findByName(world, n), n).toBeGreaterThanOrEqual(0);
    }
    expect(findByName(world, 'Atlantis')).toBe(-1);
  }, 60_000);
});
