import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { applyNation } from '@/lib/nation/registry';
import { listMinistries } from '@/lib/data/store';
import { resetParcels, recordParcel, actOnParcel, proposeParcelPolicyChange, decideParcelPolicyChange } from '@/lib/data/parcels';
import { decodeTile, fromTile } from '@/lib/geo/mvt';
import { parcelTile, parcelTileJson, resetParcelTiles, parseParcelTile, PARCEL_MIN_ZOOM, PARCEL_FIELDS } from './parcel-tiles';
import { GET as tileGET } from '@/app/api/twin/tiles/parcels/[z]/[x]/[y]/route';

const tileOf = (lng: number, lat: number, z: number) => ({
  x: Math.floor(((lng + 180) / 360) * 2 ** z),
  y: Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z),
});
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };

// Two neighbours with a jagged shared edge (a stream or an old hedge line) in a narrow band around x0.
const X0 = 36.8200, Y0 = -1.2900, W = 0.002, H = 0.002, J = 0.00004;
const jagged: [number, number][] = Array.from({ length: 61 }, (_, i) => [X0 + (i % 2 ? J : -J) * (0.3 + 0.7 * ((i * 7) % 5) / 4), Y0 + (H * i) / 60]);
const west = { type: 'Polygon', coordinates: [[[X0 - W, Y0], ...jagged, [X0 - W, Y0 + H], [X0 - W, Y0]]] };
const east = { type: 'Polygon', coordinates: [[[X0 + W, Y0], [X0 + W, Y0 + H], ...[...jagged].reverse(), [X0 + W, Y0]]] };
const RIGHTS = [{ type: 'ownership', holderKind: 'person', holder: 'Njeri Wambui', holderRef: 'ID 99887766', source: { kind: 'title', ref: 'IR 777' } }];

async function publishBoth() {
  const a = ok(await recordParcel({ parcelId: 'NRB/7/1', geometry: west, landUse: 'agricultural', rights: RIGHTS }, 'Clerk A'));
  const b = ok(await recordParcel({ parcelId: 'NRB/7/2', geometry: east, landUse: 'agricultural', rights: RIGHTS }, 'Clerk A'));
  ok(await actOnParcel(a.parcel.id, { action: 'publish' }, 'Registrar B'));
  ok(await actOnParcel(b.parcel.id, { action: 'publish' }, 'Registrar B'));
}

beforeEach(() => {
  resetParcels(); resetParcelTiles();
  applyNation({ iso3: 'KEN', regions: [] });
  const c = ok(proposeParcelPolicyChange({ patch: { authorityId: listMinistries()[0]!.id }, reason: 'Lands keeps the cadastre' }, 'Admin 1'));
  ok(decideParcelPolicyChange(c.id, 'confirm', 'Admin 2'));
});

describe('parcel vector tiles', () => {
  it('serve published parcels as polygons with public fields only, from the minimum zoom', async () => {
    const z = 16, t = tileOf(X0, Y0 + H / 2, z);
    const before = parcelTile(z, t.x, t.y);
    expect(before.features).toBe(0);
    await publishBoth();
    const r = parcelTile(z, t.x, t.y);
    expect(r.etag).not.toBe(before.etag);
    const l = decodeTile(r.bytes).find(x => x.name === 'parcels')!;
    expect(l.features.map(f => f.properties.parcelId).sort()).toEqual(['NRB/7/1', 'NRB/7/2']);
    const f = l.features[0]!;
    expect(f.type).toBe(3);
    expect(Object.keys(f.properties).every(k => k in PARCEL_FIELDS)).toBe(true);
    expect(f.properties).toMatchObject({ landUse: 'agricultural', regionCode: 'KE-30', surveyMethod: 'cadastral-import' });
    expect(Number(f.properties.areaM2)).toBeGreaterThan(40_000);
    expect(new TextDecoder().decode(r.bytes)).not.toMatch(/Njeri|99887766|IR 777|holder/i);
    const [lng, lat] = fromTile(f.rings![0]![0]![0], f.rings![0]![0]![1], z, t.x, t.y);
    expect(Math.abs(lng - X0)).toBeLessThan(0.01); expect(Math.abs(lat - Y0)).toBeLessThan(0.01);
    // Below the minimum zoom a tile is empty.
    const low = tileOf(X0, Y0, PARCEL_MIN_ZOOM - 1);
    expect(parcelTile(PARCEL_MIN_ZOOM - 1, low.x, low.y).features).toBe(0);
    expect(parseParcelTile('21', '0', '0.mvt')).toBeNull();
    expect(parcelTileJson('http://h')).toMatchObject({ minzoom: PARCEL_MIN_ZOOM, tiles: ['http://h/api/twin/tiles/parcels/{z}/{x}/{y}.mvt'], vector_layers: [expect.objectContaining({ id: 'parcels' })] });
  }, 60_000);

  it('simplify a shared edge once, so neighbours keep the same points at every zoom', async () => {
    await publishBoth();
    for (const z of [PARCEL_MIN_ZOOM, 15, 18]) {
      const t = tileOf(X0, Y0 + H / 2, z);
      const simplified = parcelTile(z, t.x, t.y), full = parcelTile(z, t.x, t.y, { simplify: false });
      const pts = (bytes: Uint8Array) => {
        const l = decodeTile(bytes).find(x => x.name === 'parcels')!;
        return Object.fromEntries(l.features.map(f => [String(f.properties.parcelId), f.rings!.flat().map(p => fromTile(p[0], p[1], z, t.x, t.y))]));
      };
      const s = pts(simplified.bytes), u = pts(full.bytes);
      const band = (ps: [number, number][]) => new Set(ps.filter(p => Math.abs(p[0] - X0) < 2 * J && p[1] > Y0 + 1e-6 && p[1] < Y0 + H - 1e-6).map(p => `${p[0].toFixed(9)},${p[1].toFixed(9)}`));
      const a = band(s['NRB/7/1']!), b = band(s['NRB/7/2']!);
      expect([...a].sort()).toEqual([...b].sort());
      expect(s['NRB/7/1']!.length).toBeLessThanOrEqual(u['NRB/7/1']!.length);
      if (z === PARCEL_MIN_ZOOM) expect(a.size).toBeLessThan(band(u['NRB/7/1']!).size);
    }
  }, 60_000);

  it('answers 304 to a client holding the current tile, and a new tile after a change', async () => {
    await publishBoth();
    const z = 16, t = tileOf(X0, Y0 + H / 2, z);
    const url = `http://localhost/api/twin/tiles/parcels/${z}/${t.x}/${t.y}.mvt`;
    const props = (y: string) => ({ params: Promise.resolve({ z: String(z), x: String(t.x), y }) });
    const first = await tileGET(new NextRequest(url), props(`${t.y}.mvt`));
    expect(first.status).toBe(200);
    expect(first.headers.get('content-type')).toBe('application/vnd.mapbox-vector-tile');
    const etag = first.headers.get('etag')!;
    expect((await tileGET(new NextRequest(url, { headers: { 'if-none-match': etag } }), props(`${t.y}.mvt`))).status).toBe(304);
    ok(await actOnParcel('NRB/7/1', { action: 'withdraw', reason: 'Merged' }, 'Registrar B'));
    const after = await tileGET(new NextRequest(url, { headers: { 'if-none-match': etag } }), props(`${t.y}.mvt`));
    expect(after.status).toBe(200);
    expect(after.headers.get('x-feature-count')).toBe('1');
  }, 60_000);
});
