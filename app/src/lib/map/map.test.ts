import { describe, it, expect } from 'vitest';
import { geoMercator, geoPath } from 'd3-geo';
import { loadNationGeography } from './geography';
import { buildMapModel } from './model';
import { quantileClasses } from './classify';
import { projectionKind } from './projection';
import { normName } from './names';
import { loadDivisions, defaultUnits } from '@/lib/geo/divisions';

// What setup gives a nation by default: its official first-level units, in order.
async function officialNames(iso3: string) {
  const lv = await loadDivisions(iso3);
  return lv[0] ? defaultUnits(lv[0]).map(d => d.name) : [];
}

describe('the nation\'s own map (map engine)', () => {
  it.each([
    ['USA', 51], ['KEN', 47], ['UGA', 4], ['NGA', 37], ['GBR', 4], ['RUS', 83], ['CHL', 16], ['NZL', 17], ['FJI', 4],
  ])('%s draws every one of its %i official units, in official order, with a shape', async (iso3, n) => {
    const names = await officialNames(iso3);
    const geo = await loadNationGeography(iso3, names);
    expect(geo!.units.map(u => u.name)).toEqual(names);
    expect(geo!.units).toHaveLength(n);
    const m = buildMapModel(geo!, { width: 800, maxHeight: 560 });
    expect(m.noShape).toEqual([]);
    expect(m.units.every(u => u.d.length > 0 && u.cx != null)).toBe(true);
  }, 60_000);

  it('builds a unit the boundary data holds only further down from its official parts (Uganda\'s regions from its districts)', async () => {
    const geo = await loadNationGeography('UGA', ['Central', 'Eastern', 'Northern', 'Western']);
    expect(geo!.units.every(u => u.geometry?.type === 'MultiPolygon')).toBe(true);
    expect(geo!.context).toEqual([]);
  }, 60_000);

  it('follows the nation\'s own region list, not six slots, and lists any it cannot place', async () => {
    const geo = await loadNationGeography('KEN', ['Nairobi', 'Mombasa', 'Atlantis']);
    expect(geo!.units.map(u => [u.name, !!u.geometry])).toEqual([['Nairobi', true], ['Mombasa', true], ['Atlantis', false]]);
    expect(geo!.context.length).toBe(45); // the other counties are drawn as context
    const m = buildMapModel(geo!, { width: 600, maxHeight: 500, values: [{ key: 'nairobi city', value: 3 }, { key: 'KE-28', value: 1 }, { key: 'Lagos', value: 9 }] });
    expect(m.units.map(u => u.value?.value)).toEqual([3, 1, undefined]);
    expect(m.unmatched).toEqual(['Lagos']);
    expect(m.noShape).toEqual(['Atlantis']);
  }, 60_000);

  it('rotates each nation to its own longitude so nations across 180° keep their size', async () => {
    for (const iso3 of ['RUS', 'FJI', 'NZL', 'USA']) {
      const geo = await loadNationGeography(iso3, await officialNames(iso3));
      const m = buildMapModel(geo!, { width: 800, maxHeight: 560 });
      // The same shapes in a plain Mercator fitted to the same frame (the earlier maps).
      const fc = { type: 'FeatureCollection', features: [...geo!.units.filter(u => u.geometry).map(u => u.geometry), ...geo!.context].map(g => ({ type: 'Feature', properties: {}, geometry: g })) };
      const merc = geoMercator().fitExtent([[10, 10], [790, m.height - 10]], fc as never);
      const mercCoverage = geoPath(merc).area(fc as never) / (800 * m.height);
      // Island nations are mostly sea: the test is that the engine uses the frame far better than Mercator did.
      expect(m.coverage, iso3).toBeGreaterThan(mercCoverage * 3);
    }
  }, 60_000);

  it('chooses a projection for the nation\'s shape', async () => {
    const fcOf = async (iso3: string) => {
      const geo = await loadNationGeography(iso3, await officialNames(iso3));
      return { type: 'FeatureCollection', features: geo!.units.map(u => ({ type: 'Feature', properties: {}, geometry: u.geometry })) } as never;
    };
    expect(projectionKind('USA', await fcOf('USA'))).toBe('albers-usa');
    expect(projectionKind('CHL', await fcOf('CHL'))).not.toBe('azimuthal-equal-area');
    expect(projectionKind('KEN', await fcOf('KEN'))).toBe('azimuthal-equal-area');
    expect(projectionKind('RUS', await fcOf('RUS'))).toBe('conic-equal-area');
  }, 60_000);

  it('gives a round scale bar and keeps the nation\'s proportions', async () => {
    const geo = await loadNationGeography('KEN', await officialNames('KEN'));
    const m = buildMapModel(geo!, { width: 390, maxHeight: 600 });
    expect(m.scale!.km).toBeGreaterThan(0);
    expect(String(m.scale!.km)).toMatch(/^[125]0*$/);
    expect(m.height).toBeGreaterThan(m.width * 0.9); // Kenya is about as tall as it is wide
  }, 60_000);
});

describe('map shading classes', () => {
  it('splits values into up to five classes that cover them in order', () => {
    const c = quantileClasses([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(c.legend).toHaveLength(5);
    expect(c.of(1)).toBe(0);
    expect(c.of(10)).toBe(4);
    expect(c.legend.map(l => [l.from, l.to])).toEqual([[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]]);
    expect(quantileClasses([]).legend).toEqual([]);
    expect(quantileClasses([4, 4]).legend).toHaveLength(1);
  });

  it('matches names whatever their accents and suffixes', () => {
    expect(normName('Région Île-de-France')).toBe('region ile de france');
  });
});
