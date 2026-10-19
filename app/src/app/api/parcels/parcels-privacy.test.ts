// Holders are personal data: a scan of every output of the land parcel
// register — its list and record APIs for viewers without need, its loads and
// policy, the OGC collection (collections, items, one item, queryables), the
// vector tiles and their TileJSON, and the audit chain — for holder fields,
// names and references. Only the cadastre authority's own officials (and
// whole-government administrators and auditors) see them, on a parcel's own
// record.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { applyNation } from '@/lib/nation/registry';
import { listMinistries } from '@/lib/data/store';
import { listAudit } from '@/lib/data/store/audit';
import { resetParcels, recordParcel, actOnParcel, proposeParcelPolicyChange, decideParcelPolicyChange, importParcels } from '@/lib/data/parcels';
import { resetParcelTiles } from '@/lib/twin/parcel-tiles';

let official: { name: string; institution?: string; role?: string } | null = null;
vi.mock('@/lib/auth/official', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/auth/official')>()),
  currentOfficial: async () => official,
  refusal: async () => null,
  withOfficial: async <T,>(b: T) => b,
}));

const list = await import('./route');
const one = await import('./[pid]/route');
const imports = await import('./import/route');
const policy = await import('./policy/route');
const collections = await import('@/app/api/twin/ogc/collections/route');
const collection = await import('@/app/api/twin/ogc/collections/[collectionId]/route');
const items = await import('@/app/api/twin/ogc/collections/[collectionId]/items/route');
const item = await import('@/app/api/twin/ogc/collections/[collectionId]/items/[featureId]/route');
const queryables = await import('@/app/api/twin/ogc/collections/[collectionId]/queryables/route');
const tile = await import('@/app/api/twin/tiles/parcels/[z]/[x]/[y]/route');
const tileJson = await import('@/app/api/twin/tiles/parcels/route');

const HOLDER = 'Kipchoge Arap-Testholder', REF = 'NID-31415926', DOC = 'TITLE-27182818';
// The holder's name, reference and document, and any holder or rights field (as a JSON key; the vocabulary's
// "holderKinds" list and the load columns' documentation are words, not data).
const PRIVATE = /Kipchoge|Testholder|31415926|27182818|"holder"\s*:|"holderKind"\s*:|"holderRef"\s*:|"rights"\s*:\s*\[/i;
const LNG = 36.8170, LAT = -1.2860;
const square = (lng: number, lat: number, d = 0.0009) => ({ type: 'Polygon', coordinates: [[[lng, lat], [lng + d, lat], [lng + d, lat + d], [lng, lat + d], [lng, lat]]] });
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const tileOf = (lng: number, lat: number, z: number) => ({
  x: Math.floor(((lng + 180) / 360) * 2 ** z),
  y: Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z),
});
const text = async (r: Response) => (r.headers.get('content-type')?.includes('vnd.mapbox') ? new TextDecoder().decode(new Uint8Array(await r.arrayBuffer())) : await r.text());
const req = (path: string) => new NextRequest(`http://localhost${path}`);
const params = <T,>(p: T) => ({ params: Promise.resolve(p) });
let lands: string, other: string;

beforeEach(async () => {
  resetParcels(); resetParcelTiles();
  applyNation({ iso3: 'KEN', regions: [] });
  const ms = listMinistries();
  lands = ms[0]!.id; other = ms[1]!.id;
  official = null;
  const c = ok(proposeParcelPolicyChange({ patch: { authorityId: lands }, reason: 'Lands keeps the cadastre' }, 'Admin 1'));
  ok(decideParcelPolicyChange(c.id, 'confirm', 'Admin 2'));
  const rights = [{ type: 'ownership', holderKind: 'person', holder: HOLDER, holderRef: REF, share: '1/1', source: { kind: 'title', ref: DOC } }];
  const a = ok(await recordParcel({ parcelId: 'NRB/1/100', geometry: square(LNG, LAT), landUse: 'residential', rights }, 'Clerk A'));
  ok(await actOnParcel(a.parcel.id, { action: 'publish' }, 'Registrar B'));
  ok(await actOnParcel(a.parcel.id, { action: 'amend', reason: 'Lease registered', rights: [...rights, { type: 'leasehold', holderKind: 'organisation', holder: `${HOLDER} Ltd`, source: { kind: 'lease', ref: DOC } }] }, 'Clerk A'));
  // A load with holder columns.
  const fc = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { parcel_id: 'NRB/1/101', land_use: 'residential', holder: HOLDER, document: DOC }, geometry: square(LNG + 0.002, LAT) }] };
  ok(await importParcels({ text: JSON.stringify(fc) }, 'Clerk A'));
  ok(await actOnParcel('NRB/1/101', { action: 'publish' }, 'Registrar B'));
});

describe('holder privacy across every output of the parcel register', () => {
  it('never carries holders in lists, records for viewers without need, loads, policy, OGC, tiles or the audit chain', async () => {
    const z = 17, t = tileOf(LNG + 0.0004, LAT + 0.0004, z);
    for (const viewer of [null, { name: 'Officer of another ministry', institution: other, role: 'officer' }, { name: 'Signatory elsewhere', institution: other, role: 'signatory' }]) {
      official = viewer;
      const outputs: [string, Response][] = [
        ['list', await list.GET(req('/api/parcels?state=all&limit=100'))],
        ['list waiting', await list.GET(req('/api/parcels?state=all&waiting=1'))],
        ['one', await one.GET(req('/api/parcels/NRB%2F1%2F100'), params({ pid: 'NRB%2F1%2F100' }))],
        ['one by record number', await one.GET(req('/api/parcels/PCL-000002'), params({ pid: 'PCL-000002' }))],
        ['loads', imports.GET()],
        ['policy', policy.GET()],
        ['collections', await collections.GET(req('/api/twin/ogc/collections'))],
        ['collection', await collection.GET(req('/api/twin/ogc/collections/parcels'), params({ collectionId: 'parcels' }))],
        ['items', await items.GET(req('/api/twin/ogc/collections/parcels/items?limit=100'), params({ collectionId: 'parcels' }))],
        ['items in a national grid', await items.GET(req('/api/twin/ogc/collections/parcels/items?crs=http://www.opengis.net/def/crs/EPSG/0/3857'), params({ collectionId: 'parcels' }))],
        ['item', await item.GET(req('/api/twin/ogc/collections/parcels/items/NRB%2F1%2F100'), params({ collectionId: 'parcels', featureId: 'NRB/1/100' }))],
        ['queryables', await queryables.GET(req('/api/twin/ogc/collections/parcels/queryables'), params({ collectionId: 'parcels' }))],
        ['tile', await tile.GET(req(`/api/twin/tiles/parcels/${z}/${t.x}/${t.y}.mvt`), params({ z: String(z), x: String(t.x), y: `${t.y}.mvt` }))],
        ['tilejson', await tileJson.GET(req('/api/twin/tiles/parcels'))],
      ];
      for (const [name, r] of outputs) {
        expect(r.status, name).toBe(200);
        const body = await text(r);
        expect(body.length, name).toBeGreaterThan(10);
        expect(body, `${name} for ${viewer?.name ?? 'no session'}`).not.toMatch(PRIVATE);
      }
    }
    // The parcels are there (the scan is not of empty answers).
    official = null;
    const ogc = await (await items.GET(req('/api/twin/ogc/collections/parcels/items'), params({ collectionId: 'parcels' }))).json() as { numberMatched: number; features: { properties: Record<string, unknown> }[] };
    expect(ogc.numberMatched).toBe(2);
    expect(ogc.features[0]!.properties).toMatchObject({ parcelId: 'NRB/1/100', landUse: 'residential', regionCode: 'KE-30' });
    const rec = await (await one.GET(req('/api/parcels/NRB%2F1%2F100'), params({ pid: 'NRB%2F1%2F100' }))).json() as { parcel: { rightsCount: number; rightsHidden: boolean; pending?: { rightsCount: number } } };
    expect(rec.parcel).toMatchObject({ rightsCount: 1, rightsHidden: true, pending: { rightsCount: 2 } });
    expect(JSON.stringify(listAudit())).not.toMatch(PRIVATE);
  }, 120_000);

  it('shows rights on a parcel\'s own record to the cadastre authority and whole-government administrators and auditors only', async () => {
    const seen = async () => JSON.stringify(await (await one.GET(req('/api/parcels/NRB%2F1%2F100'), params({ pid: 'NRB%2F1%2F100' }))).json());
    official = { name: 'Clerk at Lands', institution: lands, role: 'officer' };
    expect(await seen()).toMatch(HOLDER);
    official = { name: 'Auditor at Lands', institution: lands, role: 'auditor' };
    expect(await seen()).toMatch(REF);
    official = { name: 'Government administrator', role: 'administrator' };
    expect(await seen()).toMatch(DOC);
    official = { name: 'Government auditor', role: 'auditor' };
    expect(await seen()).toMatch(HOLDER);
    official = { name: 'Government officer', role: 'officer' };
    expect(await seen()).not.toMatch(PRIVATE);
    official = { name: 'Signatory elsewhere', institution: other, role: 'signatory' };
    expect(await seen()).not.toMatch(PRIVATE);
    // Even the authority's list never carries them (only a parcel's own record does).
    official = { name: 'Clerk at Lands', institution: lands, role: 'officer' };
    expect(await text(await list.GET(req('/api/parcels?state=all')))).not.toMatch(PRIVATE);
  }, 60_000);
});
