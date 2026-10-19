import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { describe, it, expect } from 'vitest';
import { ADMIN2, hasAdmin2, loadAdmin2, type Admin2Country } from './admin2';
import { geoArea } from 'd3-geo';
import { loadCountry } from './admin1';

const DIR = path.join(__dirname);
const KB = 1024;
const gz = (file: string) => zlib.gzipSync(fs.readFileSync(file)).length;
const listed = Object.keys(ADMIN2).sort();
const entry = (iso3: string) => ADMIN2[iso3]!;

const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
function validGeometry(g: { type: string; coordinates: unknown }): boolean {
  const ring = (r: unknown) => Array.isArray(r) && r.length >= 4 && r.every(p => Array.isArray(p) && p.length >= 2 && finite(p[0]) && finite(p[1]));
  const polygon = (p: unknown) => Array.isArray(p) && p.length > 0 && p.every(ring);
  if (g.type === 'Polygon') return polygon(g.coordinates);
  if (g.type === 'MultiPolygon') return Array.isArray(g.coordinates) && g.coordinates.length > 0 && g.coordinates.every(polygon);
  return false;
}

describe('admin2 index', () => {
  it('lists the example nations, each credited with an open licence', () => {
    expect(listed).toEqual(expect.arrayContaining(['GHA', 'KEN', 'NGA', 'UGA', 'USA']));
    for (const iso3 of listed) {
      const e = entry(iso3);
      expect(e.source.length, iso3).toBeGreaterThan(0);
      expect(e.licence, iso3).toMatch(/public domain|cc ?by|odbl|open data|open government|cc0|creative commons/i);
      expect(`${e.source}`, iso3).not.toMatch(/gadm/i);
      expect(e.units, iso3).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(DIR, 'admin2', `${iso3}.json`)), iso3).toBe(true);
    }
  });

  it('answers hasAdmin2 from the index and loads nothing for unlisted nations', async () => {
    expect(hasAdmin2('KEN')).toBe(true);
    expect(hasAdmin2('ZZZ')).toBe(false);
    expect(await loadAdmin2('ZZZ')).toBeNull();
  });
});

describe.each(listed)('admin2 %s', iso3 => {
  let country: Admin2Country | null = null;
  const load = async () => (country ??= await loadAdmin2(iso3));

  it('loads with valid units and unique codes', async () => {
    const c = await load();
    expect(c).not.toBeNull();
    expect(c!.iso3).toBe(iso3);
    expect(c!.units.length).toBe(entry(iso3).units);
    expect(c!.units.length).toBeGreaterThan(0);
    expect(c!.credit.source).toBe(entry(iso3).source);
    for (const u of c!.units) {
      expect(validGeometry(u.geometry), u.code).toBe(true);
      // d3-geo winding: an inside-out shape would cover the rest of the globe.
      expect(geoArea(u.geometry as never), u.code).toBeLessThan(2 * Math.PI);
      expect(finite(u.lng) && finite(u.lat), u.code).toBe(true);
      expect(u.name.length, u.code).toBeGreaterThan(0);
    }
    const codes = c!.units.map(u => u.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(c!.units.filter(u => u.parent).length).toBe(entry(iso3).parents);
  });

  it("places units only under first-level units the map draws", async () => {
    const c = await load();
    const top = await loadCountry(iso3);
    const codes = new Set(top!.provinces.map(p => p.code));
    for (const u of c!.units) if (u.parent) expect(codes.has(u.parent), `${u.code} → ${u.parent}`).toBe(true);
  });

  it('stays within the drill-down budget (≤ 1 MB gzipped)', () => {
    expect(gz(path.join(DIR, 'admin2', `${iso3}.json`))).toBeLessThanOrEqual(1024 * KB);
  });

  it('ships within budget at both detail levels (full ≤ 1 MB, overview ≤ 512 KB gzipped)', () => {
    const full = gz(path.join(DIR, 'topo', 'a2', `${iso3}.full.json`));
    const overview = gz(path.join(DIR, 'topo', 'a2', `${iso3}.overview.json`));
    expect(full).toBeLessThanOrEqual(1024 * KB);
    expect(overview).toBeLessThanOrEqual(512 * KB);
    expect(overview).toBeLessThanOrEqual(full);
  });
});

describe('Kenya districts', () => {
  it('sit under Kenyan counties (≥ 90% with a KE-xx parent)', async () => {
    const c = await loadAdmin2('KEN');
    const ok = c!.units.filter(u => /^KE-\d{2}$/.test(u.parent ?? '')).length;
    expect(ok / c!.units.length).toBeGreaterThanOrEqual(0.9);
  });
});

describe('first-level shape budget (≤ 300 KB gzipped)', () => {
  // Files allowed over the budget, with the reason. None today; add an entry
  // here (never shrink the data to pass) if an upgrade needs more.
  const EXCEPTIONS: Record<string, string> = {};
  const files = ['admin1', 'boundaries'].flatMap(d =>
    fs.readdirSync(path.join(DIR, d)).filter(f => f.endsWith('.json') && f !== 'index.json').map(f => `${d}/${f}`));

  it('finds the shape files', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('keeps every file within budget', () => {
    const over = files.filter(f => !EXCEPTIONS[f] && gz(path.join(DIR, f)) > 300 * KB);
    expect(over).toEqual([]);
  });
});

// What the maps load: TopoJSON packs (scripts/build-topo.mjs) in two detail levels.
describe('shipped shape packs: budgets at both detail levels', () => {
  const sizes = (level: 'a1' | 'a2') => {
    const dir = path.join(DIR, 'topo', level);
    const isos = [...new Set(fs.readdirSync(dir).map(f => f.slice(0, 3)))].sort();
    return isos.map(iso3 => ({ iso3, full: gz(path.join(dir, `${iso3}.full.json`)), overview: gz(path.join(dir, `${iso3}.overview.json`)) }));
  };
  const a1 = sizes('a1'), a2 = sizes('a2');
  const total = (rows: { full: number; overview: number }[], k: 'full' | 'overview') => rows.reduce((s, r) => s + r[k], 0);

  it('keeps every first-level pack within budget (full ≤ 300 KB, overview ≤ 150 KB gzipped)', () => {
    expect(a1.length).toBeGreaterThan(200);
    expect(a1.filter(r => r.full > 300 * KB).map(r => r.iso3)).toEqual([]);
    expect(a1.filter(r => r.overview > 150 * KB).map(r => r.iso3)).toEqual([]);
  });

  it('never makes an overview larger than its full detail', () => {
    // A tiny country's overview is its full shapes (a few bytes of labelling more).
    expect([...a1, ...a2].filter(r => r.overview > r.full + 64).map(r => r.iso3)).toEqual([]);
  });

  it('makes the overview materially smaller (≤ 75% of full for regions, ≤ 60% for districts, in total)', () => {
    expect(total(a1, 'overview')).toBeLessThanOrEqual(0.75 * total(a1, 'full'));
    expect(total(a2, 'overview')).toBeLessThanOrEqual(0.6 * total(a2, 'full'));
  });

  it('ships smaller than the source files they are built from', () => {
    const src = ['admin1', 'boundaries'].flatMap(d => fs.readdirSync(path.join(DIR, d)).filter(f => /^[A-Z]{3}\.json$/.test(f)).map(f => gz(path.join(DIR, d, f))));
    expect(total(a1, 'full')).toBeLessThan(src.reduce((s, n) => s + n, 0));
  });
});
