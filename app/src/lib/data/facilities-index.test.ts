import { describe, it, expect, beforeEach } from 'vitest';
import { geoDistance } from 'd3-geo';
import { resetFacilities, findDuplicates, listFacilities, sitesNear, categoryOf, SAME_NAME_METRES, type Facility } from './facilities';
import { applyNation } from '@/lib/nation/registry';

// 20,000 synthetic sites over Kenya, written straight into the store as a
// restored snapshot would be (no map checks), to measure the duplicate check.
const N = 20_000;
const g = globalThis as unknown as { __civicosFacilities?: { facilities: Facility[]; policy: { generaliseDegrees: number } } };

function rand(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

function seedSites(): Facility[] {
  const r = rand(42);
  const cats = ['school', 'health', 'police', 'water', 'market'];
  const out: Facility[] = [];
  for (let i = 0; i < N; i++) {
    // Clusters around 400 towns, so sites share cells and fall within duplicate distances.
    const town = Math.floor(r() * 400);
    const lng = 34 + (town % 20) * 0.4 + r() * 0.12, lat = -4 + Math.floor(town / 20) * 0.45 + r() * 0.12;
    const category = cats[Math.floor(r() * cats.length)]!;
    const id = `FAC-${String(i + 1).padStart(5, '0')}`;
    out.push({
      id, name: `Site ${i % 3000}`, category, ownerId: 'm', ids: i % 7 === 0 ? { [categoryOf(category)!.scheme]: `C${i % 1500}` } : {},
      status: 'operational', sensitivity: category === 'police' ? 'restricted' : 'public',
      location: { lng: Math.round(lng * 1e6) / 1e6, lat: Math.round(lat * 1e6) / 1e6, method: 'survey-import' },
      place: { inside: true }, state: i % 50 === 0 ? 'withdrawn' : 'published', proposedBy: 'a', proposedAt: '2026-01-01T00:00:00Z',
      certification: { required: ['institution'], stamps: [], state: 'awaiting' }, source: { kind: 'import' }, versions: [],
    });
  }
  return out;
}

/** The check as it was: every site, every time. */
function linear(sites: Facility[], q: { lng: number; lat: number; category: string; name?: string; ids?: Record<string, string>; exceptId?: string }) {
  const cat = categoryOf(q.category);
  const name = (q.name ?? '').trim().toLowerCase();
  const m = (f: Facility) => Math.round(geoDistance([q.lng, q.lat], [f.location.lng, f.location.lat]) * 6_371_008.8);
  return sites
    .filter(f => f.state !== 'withdrawn' && f.id !== q.exceptId && f.category === q.category)
    .map(f => ({ f, m: m(f) }))
    .filter(({ f, m: d }) => d <= (cat?.duplicateMetres ?? 200) || (name && f.name.toLowerCase() === name && d < SAME_NAME_METRES) || Object.entries(q.ids ?? {}).some(([k, v]) => v && f.ids[k] === v))
    .map(({ f, m: d }) => ({ id: f.id, name: f.name, metres: d }));
}

let sites: Facility[];
beforeEach(() => {
  resetFacilities();
  applyNation({ iso3: 'KEN', regions: [] });
  listFacilities(); // create the store
  sites = seedSites();
  g.__civicosFacilities!.facilities = sites;
});

describe('facility spatial index', () => {
  it('gives the same duplicates as scanning every site', () => {
    const r = rand(7);
    for (let i = 0; i < 400; i++) {
      const f = sites[Math.floor(r() * N)]!;
      const q = { lng: f.location.lng + (r() - 0.5) * 0.004, lat: f.location.lat + (r() - 0.5) * 0.004, category: f.category, name: r() < 0.5 ? f.name : undefined, ids: r() < 0.3 ? f.ids : undefined, exceptId: r() < 0.2 ? f.id : undefined };
      expect(findDuplicates(q)).toEqual(linear(sites, q));
    }
  });

  it('checks 20,000 sites against the register without scanning it each time', () => {
    findDuplicates({ lng: 36.8, lat: -1.3, category: 'school' }); // build the index once
    const t0 = performance.now();
    let found = 0;
    for (const f of sites) found += findDuplicates({ lng: f.location.lng, lat: f.location.lat, category: f.category, name: f.name, ids: f.ids, exceptId: f.id }).length;
    const ms = performance.now() - t0;
    expect(found).toBeGreaterThan(0);
    // A scan would compare 20,000 × 20,000 = 4·10⁸ pairs (minutes); the grid reads the cells around each site.
    expect(ms).toBeLessThan(8_000);
    // Each query looks at a small neighbourhood, not the register.
    const looked = sites.slice(0, 200).map(f => sitesNear(f.location.lng, f.location.lat, SAME_NAME_METRES).length);
    expect(Math.max(...looked)).toBeLessThan(N / 4);
  }, 30_000);

  it('is rebuilt after a restore and follows new sites', () => {
    const before = findDuplicates({ lng: sites[5]!.location.lng, lat: sites[5]!.location.lat, category: sites[5]!.category });
    // A snapshot restored by lib/data/persist.ts replaces the store object.
    g.__civicosFacilities = structuredClone(g.__civicosFacilities!);
    const after = findDuplicates({ lng: sites[5]!.location.lng, lat: sites[5]!.location.lat, category: sites[5]!.category });
    expect(after).toEqual(before);
    const added = { ...structuredClone(sites[5]!), id: 'FAC-99999', name: 'New one', state: 'published' as const };
    g.__civicosFacilities!.facilities.push(added);
    expect(findDuplicates({ lng: added.location.lng, lat: added.location.lat, category: added.category }).map(d => d.id)).toContain('FAC-99999');
  });

  it('answers bbox queries from the grid, on the positions the viewer may see', () => {
    const box: [number, number, number, number] = [36.0, -2.3, 36.9, -1.0];
    const inBox = (f: { location: { lng: number; lat: number } }) => f.location.lng >= box[0] && f.location.lng <= box[2] && f.location.lat >= box[1] && f.location.lat <= box[3];
    for (const viewer of [{ signedIn: true }, { signedIn: false }]) {
      const want = listFacilities({}, viewer).filter(inBox).map(f => f.id);
      const got = listFacilities({ bbox: box }, viewer).map(f => f.id);
      expect(got).toEqual(want);
      expect(got.length).toBeGreaterThan(0);
    }
  });
});
