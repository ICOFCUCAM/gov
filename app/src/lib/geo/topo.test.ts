// TopoJSON packs and their two detail levels (docs/MAP_SYSTEM_PLAN.md, phase 3):
// built from the source files by scripts/build-topo.mjs; the loaders decode
// them into the same shapes as before.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { feature, neighbors } from 'topojson-client';
import { geoArea, geoContains } from 'd3-geo';
import { COUNTRIES, loadCountry, type Geom } from './admin1';
import { ADMIN2, loadAdmin2 } from './admin2';
import { loadNationGeography, loadDistricts, loadUnitGeography } from '@/lib/map/geography';

const DIR = __dirname;
const TOPO = path.join(DIR, 'topo');
const read = (f: string) => JSON.parse(fs.readFileSync(f, 'utf8'));
const INDEX = read(path.join(TOPO, 'index.json')) as Record<'a1' | 'a2', Record<string, { from: string; sha256: string }>>;
type Level = 'a1' | 'a2';
type Pack = { civicos: { iso3: string; from?: string; detail: string }; objects: { units?: { geometries: { properties: Record<string, unknown> }[] }; outline?: unknown } } & Record<string, unknown>;
const pack = (level: Level, iso3: string, detail: 'full' | 'overview') => read(path.join(TOPO, level, `${iso3}.${detail}.json`)) as Pack;
const entries = (level: Level) => Object.entries(INDEX[level]);

/** Units of a pack decoded with topojson-client, in order. */
function decode(t: Pack): { props: Record<string, unknown>; geometry: Geom }[] {
  if (t.objects.units) return (feature(t as never, t.objects.units as never) as unknown as { features: { properties: Record<string, unknown>; geometry: Geom }[] }).features.map(f => ({ props: f.properties, geometry: f.geometry }));
  return [{ props: {}, geometry: (feature(t as never, t.objects.outline as never) as unknown as { geometry: Geom }).geometry }];
}
/** Units of a source file, in order. */
function sourceUnits(level: Level, from: string): { props: Record<string, unknown>; geometry: Geom }[] {
  const s = read(path.join(DIR, from));
  if (level === 'a2') return s.units.map(({ geometry, ...props }: { geometry: Geom }) => ({ props, geometry }));
  if (s.provinces) return s.provinces.map(({ geometry, ...props }: { geometry: Geom }) => ({ props, geometry }));
  return [{ props: {}, geometry: s.geometry }];
}
const rings = (g: Geom) => (g.type === 'Polygon' ? [g.coordinates as number[][][]] : (g.coordinates as number[][][][])).flat();
const vertices = (g: Geom) => new Set(rings(g).flat().map(p => `${p[0]!.toFixed(6)},${p[1]!.toFixed(6)}`));

describe('pack index', () => {
  it('has both levels for every country and every district file, built from the current sources', () => {
    const stale: string[] = [];
    for (const level of ['a1', 'a2'] as const) {
      for (const [iso3, e] of entries(level)) {
        for (const d of ['full', 'overview']) expect(fs.existsSync(path.join(TOPO, level, `${iso3}.${d}.json`)), `${level}/${iso3}.${d}`).toBe(true);
        const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, e.from))).digest('hex');
        if (sha !== e.sha256) stale.push(e.from);
      }
    }
    // A source changed (build-boundaries, official-names, build-map-pack) without `npm run build:topo`.
    expect(stale, 'run npm run build:topo').toEqual([]);
    for (const c of COUNTRIES) expect(INDEX.a1[c.iso3], c.iso3).toBeDefined();
    for (const iso3 of Object.keys(ADMIN2)) expect(INDEX.a2[iso3], iso3).toBeDefined();
  });

  it('builds first-level packs from the same source loadCountry used before the packs', () => {
    const upgraded = read(path.join(DIR, 'boundaries', 'index.json')) as Record<string, unknown>;
    for (const [iso3, e] of entries('a1')) {
      const want = upgraded[iso3] ? 'boundaries' : COUNTRIES.find(c => c.iso3 === iso3)?.provinces ? 'admin1' : 'outline';
      expect(e.from, iso3).toBe(`${want}/${iso3}.json`);
    }
  });
});

describe.each(['a1', 'a2'] as const)('%s packs', level => {
  it('keep every unit with the same fields, in the same order, in both levels', () => {
    for (const [iso3, e] of entries(level)) {
      const src = sourceUnits(level, e.from).map(u => u.props);
      const props = (t: Pack) => (t.objects.units ? t.objects.units.geometries.map(g => g.properties) : [{}]);
      expect(props(pack(level, iso3, 'full')), `${iso3} full`).toEqual(src);
      expect(props(pack(level, iso3, 'overview')), `${iso3} overview`).toEqual(src);
    }
  });

  it('keep every vertex of the source at full detail (lossless)', () => {
    for (const [iso3, e] of entries(level)) {
      const src = sourceUnits(level, e.from);
      const full = decode(pack(level, iso3, 'full'));
      full.forEach((u, i) => {
        const a = vertices(u.geometry), b = vertices(src[i]!.geometry);
        expect(a.size === b.size && [...a].every(v => b.has(v)), `${iso3} unit ${i}`).toBe(true);
        expect(Math.abs(geoArea(u.geometry as never) - geoArea(src[i]!.geometry as never)), `${iso3} unit ${i}`).toBeLessThan(1e-9);
      });
    }
  });

  it('draw every unit in the overview, none inside out, with the same neighbours as full detail', () => {
    const bad: string[] = [];
    for (const [iso3] of entries(level)) {
      const over = pack(level, iso3, 'overview');
      for (const u of decode(over)) {
        const rs = rings(u.geometry);
        if (!rs.length || rs.some(r => r.length < 4)) bad.push(`${iso3} ${u.props.code}: degenerate`);
        if (geoArea(u.geometry as never) > 2 * Math.PI) bad.push(`${iso3} ${u.props.code}: inside out`);
      }
      if (over.objects.units) {
        const touching = (t: Pack) => JSON.stringify(neighbors(t.objects.units!.geometries as never).map((n, i) => n.filter(j => j !== i)));
        if (touching(over) !== touching(pack(level, iso3, 'full'))) bad.push(`${iso3}: neighbours differ`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('loaders', () => {
  it('return the same units, codes and names in both levels', async () => {
    for (const iso3 of ['KEN', 'USA', 'FRA', 'RUS', 'UGA', 'ABW']) {
      const [o, f] = await Promise.all([loadCountry(iso3, 'overview'), loadCountry(iso3, 'full')]);
      expect(o && f, iso3).toBeTruthy();
      const fields = (c: NonNullable<typeof o>) => c.provinces.map(({ geometry: _g, ...p }) => p);
      expect(fields(o!), iso3).toEqual(fields(f!));
      expect(o!.attribution, iso3).toEqual(f!.attribution);
      expect([o!.iso3, o!.iso2, o!.name], iso3).toEqual([f!.iso3, f!.iso2, f!.name]);
    }
    for (const iso3 of Object.keys(ADMIN2)) {
      const [o, f] = await Promise.all([loadAdmin2(iso3, 'overview'), loadAdmin2(iso3, 'full')]);
      const fields = (c: NonNullable<typeof o>) => c.units.map(({ geometry: _g, ...u }) => u);
      expect(fields(o!), iso3).toEqual(fields(f!));
      expect(o!.credit, iso3).toEqual(f!.credit);
    }
  }, 60_000);

  it('default to the overview for a whole country and full detail for districts', async () => {
    expect(await loadCountry('KEN')).toBe(await loadCountry('KEN', 'overview'));
    expect(await loadAdmin2('KEN')).toBe(await loadAdmin2('KEN', 'full'));
    expect(await loadDistricts('KEN')).toBe(await loadAdmin2('KEN', 'full'));
  });

  it('make the overview materially lighter', async () => {
    const vertexCount = (gs: Geom[]) => gs.reduce((s, g) => s + rings(g).reduce((t, r) => t + r.length, 0), 0);
    const [o, f] = await Promise.all([loadCountry('CAN', 'overview'), loadCountry('CAN', 'full')]);
    expect(vertexCount(o!.provinces.map(p => p.geometry))).toBeLessThan(vertexCount(f!.provinces.map(p => p.geometry)) / 3);
  });

  it('outline-only and unknown countries behave as before', async () => {
    expect(await loadCountry('ZZZ')).toBeNull();
    expect(await loadCountry('../x' as string)).toBeNull();
    expect(await loadAdmin2('ZZZ', 'overview')).toBeNull();
  });
});

describe('position checks at full detail', () => {
  const at = (iso3: string, lng: number, lat: number) => [iso3, lng, lat] as const;
  // Each place and the unit it lies in.
  const PLACES: [readonly [string, number, number], string, string?][] = [
    [at('KEN', 36.81724, -1.28638), 'KE-30', 'KE-30'], // Nairobi
    [at('KEN', 39.6682, -4.0435), 'KE-28', 'KE-28'], // Mombasa (an island: only full detail holds it)
    [at('UGA', 32.5825, 0.3476), 'UG-102', 'UG-102'], // Kampala
    [at('USA', -97.7431, 30.2672), 'US-TX', 'US-TX'], // Austin
    [at('USA', -104.9903, 39.7392), 'US-CO', 'US-CO'], // Denver
    [at('NGA', 3.3792, 6.5244), 'NG-LA', 'NG-LA'], // Lagos
    [at('GHA', -0.187, 5.6037), 'GH-AA', 'GH-AA'], // Accra
    [at('FRA', 2.3522, 48.8566), 'FR-75'], // Paris
  ];

  it.each(PLACES)('%s lies in %s', async ([iso3, lng, lat], region, districtParent) => {
    const c = await loadCountry(iso3, 'full');
    expect(c!.provinces.filter(p => geoContains(p.geometry as never, [lng, lat])).map(p => p.code)).toEqual([region]);
    if (districtParent) {
      const a2 = await loadAdmin2(iso3, 'full');
      const hits = a2!.units.filter(u => geoContains(u.geometry as never, [lng, lat]));
      expect(hits.map(u => u.parent)).toEqual([districtParent]);
    }
  }, 30_000);

  it('places Nairobi in Nairobi City through the nation geography at full detail', async () => {
    const geo = await loadNationGeography('KEN', [], 'full');
    const unit = geo!.units.find(u => u.geometry && geoContains(u.geometry as never, [36.81724, -1.28638]));
    expect(unit?.code).toBe('KE-30');
    const opened = await loadUnitGeography('KEN', { name: 'Nairobi City', code: 'KE-30' });
    expect(opened!.units.length).toBeGreaterThan(1);
    expect(opened!.units.filter(u => u.geometry && geoContains(u.geometry as never, [36.81724, -1.28638]))).toHaveLength(1);
  }, 30_000);
});
