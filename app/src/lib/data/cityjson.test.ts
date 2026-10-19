import { describe, it, expect, beforeEach } from 'vitest';
import { facilitiesCityJson } from './cityjson';
import { resetFacilities, proposeFacility, actOnFacility, checkStructure, listFacilities, getFacility } from './facilities';
import { listMinistries } from './store';
import { applyNation } from '@/lib/nation/registry';

const AT = { lng: 36.81724, lat: -1.28638 };
// A 50 m × 40 m building around the site, wound clockwise (it is turned).
const box = (lng = AT.lng, lat = AT.lat) => ({ type: 'Polygon', coordinates: [[[lng - 0.00022, lat - 0.00018], [lng - 0.00022, lat + 0.00018], [lng + 0.00022, lat + 0.00018], [lng + 0.00022, lat - 0.00018], [lng - 0.00022, lat - 0.00018]]] });
let m: string;

beforeEach(() => { resetFacilities(); applyNation({ iso3: 'KEN', regions: [] }); m = listMinistries()[0]!.id; });

async function site(name: string, category: string, extra: Record<string, unknown> = {}, at = AT) {
  const r = await proposeFacility(m, { name, category, ...at, method: 'device-gps', ...extra }, 'Officer A');
  if ('error' in r) throw new Error(r.error);
  await actOnFacility(r.facility.id, { action: 'publish' }, 'Signer B');
  return r.facility.id;
}

describe('3D readiness: footprints, heights and CityJSON', () => {
  it('checks a footprint, height and storeys', () => {
    const ok = checkStructure({ footprint: box(), heightM: 12.34, levels: 3 }, AT);
    if ('error' in ok) throw new Error(ok.error);
    const ring = ok.value.footprint!.coordinates[0]!;
    // Turned anticlockwise (positive area seen from above) and closed.
    const twice = ring.slice(0, -1).reduce((s, p, i) => s + p[0]! * ring[i + 1]![1]! - ring[i + 1]![0]! * p[1]!, 0);
    expect(twice).toBeGreaterThan(0);
    expect(ring[0]).toEqual(ring.at(-1));
    expect(ok.value).toMatchObject({ heightM: 12.3, levels: 3 });
    expect(checkStructure({ footprint: JSON.stringify({ type: 'Feature', geometry: box() }) }, AT)).toMatchObject({ value: { footprint: { type: 'Polygon' } } });
    expect(checkStructure({ footprint: { type: 'Point', coordinates: [1, 2] } }, AT)).toEqual({ error: expect.stringMatching(/Polygon/) });
    expect(checkStructure({ footprint: '{nope' }, AT)).toEqual({ error: expect.stringMatching(/GeoJSON/) });
    expect(checkStructure({ footprint: { type: 'Polygon', coordinates: [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]] } }, { lng: 0.5, lat: 0.5 })).toEqual({ error: expect.stringMatching(/crosses itself/) });
    expect(checkStructure({ footprint: box(AT.lng + 0.05, AT.lat) }, AT)).toEqual({ error: expect.stringMatching(/m from the site's position/) });
    expect(checkStructure({ footprint: { type: 'Polygon', coordinates: [[[36, -1], [36.1, -1], [36.1, -1.1], [36, -1.1], [36, -1]]] } }, { lng: 36.05, lat: -1.05 })).toEqual({ error: expect.stringMatching(/5 km²/) });
    expect(checkStructure({ heightM: 2000 }, AT)).toEqual({ error: expect.stringMatching(/Height/) });
    expect(checkStructure({ levels: 2.5 }, AT)).toEqual({ error: expect.stringMatching(/Storeys/) });
    const odd = checkStructure({ heightM: 100, levels: 2 }, AT);
    expect('error' in odd ? [] : odd.warnings.join(' ')).toMatch(/50 m a storey/);
  });

  it('records the building with the site, changes it as a version, and hides the outline of a restricted site', async () => {
    const id = await site('Records Office', 'government-office', { footprint: box(), heightM: 15, levels: 4 });
    expect(getFacility(id)).toMatchObject({ heightM: 15, levels: 4, footprint: { type: 'Polygon' } });
    expect(await proposeFacility(m, { name: 'X', category: 'school', ...AT, footprint: { type: 'LineString', coordinates: [] } }, 'A')).toEqual(expect.objectContaining({ error: expect.stringMatching(/Polygon/) }));
    const changed = await actOnFacility(id, { action: 'structure', heightM: 18, levels: null }, 'Officer A');
    if ('error' in changed) throw new Error(changed.error);
    expect(changed.heightM).toBe(18);
    expect(changed.levels).toBeUndefined();
    expect(changed.versions.at(-1)!.what).toBe('building: height 18 m, storeys removed');
    const police = await site('Central Police Station', 'police', { footprint: box(), heightM: 9 });
    expect(listFacilities({}, { signedIn: false }).find(f => f.id === police)!.footprint).toBeUndefined();
    expect(listFacilities({}, { signedIn: true }).find(f => f.id === police)!.footprint).toBeDefined();
  });

  it('exports CityJSON 2.0: LoD1 solids where footprint and height exist, LoD0 otherwise, as the viewer may see them', async () => {
    const office = await site('Records Office', 'government-office', { footprint: box(), heightM: 15, levels: 4 });
    const market = await site('City Market', 'market', { footprint: box(AT.lng + 0.01, AT.lat) }, { lng: AT.lng + 0.01, lat: AT.lat });
    const school = await site('Hill School', 'school', {}, { lng: AT.lng + 0.02, lat: AT.lat + 0.01 });
    const police = await site('Central Police Station', 'police', { footprint: box(AT.lng - 0.01, AT.lat), heightM: 9 }, { lng: AT.lng - 0.01, lat: AT.lat });
    const { doc, counts } = facilitiesCityJson({ signedIn: true });
    expect(doc).toMatchObject({ type: 'CityJSON', version: '2.0', transform: { scale: [1e-7, 1e-7, 0.01] }, metadata: { referenceSystem: 'https://www.opengis.net/def/crs/EPSG/0/4979' } });
    expect(counts).toEqual({ lod1: 2, lod0Footprints: 1, lod0Points: 1 });
    const objs = doc.CityObjects as Record<string, { type: string; attributes: Record<string, unknown>; geometry: { type: string; lod: string; boundaries: unknown }[] }>;
    const byFac = (id: string) => Object.values(objs).find(o => o.attributes.facilityId === id)!;
    const o = byFac(office);
    expect(o.type).toBe('Building');
    expect(o.attributes).toMatchObject({ measuredHeight: 15, storeysAboveGround: 4, category: 'government-office', nationalId: expect.any(String) });
    const solid = o.geometry[0]!;
    expect(solid).toMatchObject({ type: 'Solid', lod: '1' });
    const shell = (solid.boundaries as number[][][][])[0]!;
    expect(shell).toHaveLength(6); // bottom, top and four walls
    // Every edge of a closed shell is used twice, once in each direction.
    const edges = new Map<string, number>();
    for (const face of shell) { const r = face[0]!; r.forEach((a, i) => { const b = r[(i + 1) % r.length]!; edges.set(`${a}>${b}`, (edges.get(`${a}>${b}`) ?? 0) + 1); }); }
    for (const k of edges.keys()) { const [a, b] = k.split('>'); expect(edges.get(`${b}>${a}`)).toBe(1); }
    // The top is at 15 m and the bottom at 0.
    const verts = doc.vertices as number[][];
    expect(Math.max(...shell[1]![0]!.map(i => verts[i]![2]!)) * 0.01).toBeCloseTo(15);
    expect(Math.max(...shell[0]![0]!.map(i => verts[i]![2]!))).toBe(0);
    // Decoded positions land on the footprint.
    const [x0, y0] = (doc.transform as { translate: number[] }).translate;
    const lngs = shell[0]![0]!.map(i => verts[i]![0]! * 1e-7 + x0!);
    expect(Math.min(...lngs)).toBeCloseTo(AT.lng - 0.00022, 6);
    expect(byFac(market).geometry[0]).toMatchObject({ type: 'MultiSurface', lod: '0' });
    expect(byFac(school)).toMatchObject({ type: 'GenericCityObject', geometry: [{ type: 'MultiPoint', lod: '0' }] });
    // The public: the restricted police station as a generalised point, no outline.
    const pub = facilitiesCityJson({ signedIn: false });
    const p = Object.values(pub.doc.CityObjects as typeof objs).find(x => x.attributes.facilityId === police)!;
    expect(p).toMatchObject({ type: 'GenericCityObject', attributes: { positionGeneralised: true }, geometry: [{ type: 'MultiPoint' }] });
    expect(pub.counts.lod1).toBe(1);
  });
});
