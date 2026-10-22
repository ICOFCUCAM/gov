// Holders are personal data: a scan of every output of the land parcel
// register — its list and record APIs for viewers without need, its loads and
// policy, the OGC collection (collections, items, one item, queryables), the
// vector tiles and their TileJSON, and the audit chain — for holder fields,
// names and references. Only the cadastre authority's own officials (and
// whole-government administrators and auditors) see them, on a parcel's own
// record. Since plan step I7 a lease is registered on the parcel through the
// land registry's procedure (two officials), and the land register's own
// outputs (/api/land: its list, a parcel's transactions and disputes) are
// scanned too: parties and grounds only for those with need.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { applyNation } from '@/lib/nation/registry';
import { listMinistries } from '@/lib/data/store';
import { listAudit } from '@/lib/data/store/audit';
import { resetParcels, recordParcel, actOnParcel, proposeParcelPolicyChange, decideParcelPolicyChange, importParcels } from '@/lib/data/parcels';
import { resetParcelTiles } from '@/lib/twin/parcel-tiles';
import { listAccess, resetAccessLog } from '@/lib/records/access-log';
import { setSovereign, institutionBounds } from '@/lib/data/store';
import { act, attach, openCase, resetCases, registeredEffects } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions } from '@/lib/records/decisions';
import { asNationSets } from '@/lib/casework/testkit';
import { LAND_PROCEDURES } from '@/lib/land/procedures';
import { resetLand } from '@/lib/land/register';

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
const land = await import('@/app/api/land/route');

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

/** The land registry registers a lease on the parcel: lodged, the parties verified, decided by two officials (lib/land/procedures.ts). */
async function registerLease(parcel: string, holder: string) {
  const who = (id: string, role: 'officer' | 'signatory') => ({ id, name: `Official ${id}`, scope: { id, role, institution: lands, bounds: institutionBounds() } });
  const c = openCase({ procedure: 'land.encumbrance', fields: { parcel, encumbranceType: 'leasehold', beneficiary: holder, beneficiaryKind: 'organisation', beneficiaryRef: REF, instrumentKind: 'lease', instrumentRef: DOC } }, who('clerk', 'officer'));
  if ('error' in c) throw new Error(c.error);
  for (const cls of ['instrument', 'identity-evidence']) attach(c.id, (addDocument({ class: cls, title: cls, institution: lands, belongsTo: { kind: 'case', id: c.id }, bytes: new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF')) }, 'Clerk') as { id: string }).id, who('clerk', 'officer'));
  for (const [action, by, reason] of [['lodge', who('clerk', 'officer'), undefined], ['verify', who('clerk', 'officer'), 'Lease and parties checked'], ['register', who('s1', 'signatory'), 'Lease registered'], ['register', who('s2', 'signatory'), undefined]] as const) {
    const r = await act(c.id, { action, ...(reason ? { reason } : {}) }, by);
    if ('error' in r) throw new Error(`${action}: ${r.error}`);
  }
}

beforeEach(async () => {
  resetParcels(); resetParcelTiles();
  for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetLand]) r();
  vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
  const ms = listMinistries();
  lands = ms[0]!.id; other = ms[1]!.id;
  setSovereign({ deployment: { authorities: { landRegistry: lands } } }, 'Administrator');
  applyNation({ iso3: 'KEN', regions: [] });
  for (const p of LAND_PROCEDURES) {
    const d = draftPackage(asNationSets(p), 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(d.error);
    const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(a.error);
  }
  official = null;
  const c = ok(proposeParcelPolicyChange({ patch: { authorityId: lands }, reason: 'Lands keeps the cadastre' }, 'Admin 1'));
  ok(decideParcelPolicyChange(c.id, 'confirm', 'Admin 2'));
  const rights = [{ type: 'ownership', holderKind: 'person', holder: HOLDER, holderRef: REF, share: '1/1', source: { kind: 'title', ref: DOC } }];
  const a = ok(await recordParcel({ parcelId: 'NRB/1/100', geometry: square(LNG, LAT), landUse: 'residential', rights }, 'Clerk A'));
  ok(await actOnParcel(a.parcel.id, { action: 'publish' }, 'Registrar B'));
  // The lease through the land registry's procedure (rights of a published parcel change only so), then a change of land use waiting for a second official.
  await registerLease(a.parcel.id, `${HOLDER} Ltd`);
  ok(await actOnParcel(a.parcel.id, { action: 'amend', reason: 'Change of user', landUse: 'commercial' }, 'Clerk A'));
  // A load with holder columns.
  const fc = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { parcel_id: 'NRB/1/101', land_use: 'residential', holder: HOLDER, document: DOC }, geometry: square(LNG + 0.002, LAT) }] };
  ok(await importParcels({ text: JSON.stringify(fc) }, 'Clerk A'));
  ok(await actOnParcel('NRB/1/101', { action: 'publish' }, 'Registrar B'));
});

afterEach(() => { vi.unstubAllEnvs(); setSovereign({ deployment: { authorities: {} } }, 'test'); });

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
        ['land register', await land.GET(req('/api/land'))],
        ['land: one parcel\'s transactions and disputes', await land.GET(req('/api/land?parcel=NRB%2F1%2F100'))],
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
    expect(rec.parcel).toMatchObject({ rightsCount: 2, rightsHidden: true, pending: { rightsCount: 2 } });
    // The land register has the lease's transaction: by reference, its parties hidden.
    const lr = await (await land.GET(req('/api/land?parcel=PCL-000001'))).json() as { transactions: { kind: string; interest: string; partiesHidden: boolean }[]; interestsCount: number };
    expect(lr.transactions).toMatchObject([{ kind: 'encumbrance', interest: 'PCL-000001/R2', partiesHidden: true }]);
    expect(lr.interestsCount).toBe(2);
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
    // The land registry's parties too, for the keepers only (the land registry is the cadastre authority here).
    const parties = async () => JSON.stringify(await (await land.GET(req('/api/land?parcel=NRB%2F1%2F100'))).json());
    official = { name: 'Clerk at Lands', institution: lands, role: 'officer' };
    expect(await parties()).toMatch(`${HOLDER} Ltd`);
    official = { name: 'Signatory elsewhere', institution: other, role: 'signatory' };
    expect(await parties()).not.toMatch(PRIVATE);
    official = { name: 'Government officer', role: 'officer' };
    expect(await seen()).not.toMatch(PRIVATE);
    official = { name: 'Signatory elsewhere', institution: other, role: 'signatory' };
    expect(await seen()).not.toMatch(PRIVATE);
    // Even the authority's list never carries them (only a parcel's own record does).
    official = { name: 'Clerk at Lands', institution: lands, role: 'officer' };
    expect(await text(await list.GET(req('/api/parcels?state=all')))).not.toMatch(PRIVATE);
  }, 60_000);

  it('writes each read of rights and holders to the access log by reference only; a read without them is not logged (step I0.1)', async () => {
    resetAccessLog();
    const read = () => one.GET(req('/api/parcels/NRB%2F1%2F100'), params({ pid: 'NRB%2F1%2F100' }));
    official = { name: 'Clerk at Lands', institution: lands, role: 'officer' };
    await read();
    official = { name: 'Government auditor', role: 'auditor' };
    await read();
    official = { name: 'Signatory elsewhere', institution: other, role: 'signatory' };
    await read();
    const log = listAccess({ register: 'parcels' });
    expect(log).toHaveLength(2);
    expect(log.every(e => e.v === 2 && e.action === 'view' && e.result === 'allowed' && e.record.id === 'PCL-000001')).toBe(true);
    expect(log.map(e => e.by.name).sort()).toEqual(['Clerk at Lands', 'Government auditor']);
    expect(JSON.stringify(log)).not.toMatch(PRIVATE);
  }, 60_000);
});
