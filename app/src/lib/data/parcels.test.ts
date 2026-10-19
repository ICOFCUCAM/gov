import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetParcels, recordParcel, actOnParcel, proposeParcelPolicyChange, decideParcelPolicyChange, parcelPolicy, getParcel, pageParcels,
  importParcels, withdrawParcelImport, viewParcel, publicParcel, parcelGeneration, readRights, checkParcel,
} from './parcels';
import { listMinistries } from './store';
import { listAudit } from './store/audit';
import { applyNation } from '@/lib/nation/registry';
import { crsByEpsg } from '@/lib/geo/crs';

/** A square parcel `m` metres a side with its south-west corner at a point. */
export function square(lng: number, lat: number, m = 100) {
  const dx = m / (111_320 * Math.cos((lat * Math.PI) / 180)), dy = m / 110_574;
  return { type: 'Polygon' as const, coordinates: [[[lng, lat], [lng + dx, lat], [lng + dx, lat + dy], [lng, lat + dy], [lng, lat]]] };
}
const NAIROBI = { lng: 36.81724, lat: -1.28638 };
const RIGHTS = [{ type: 'ownership', holderKind: 'person', holder: 'Achieng Otieno', holderRef: 'ID 12345678', share: '1/1', source: { kind: 'title', ref: 'IR 55501', date: '2019-04-01' } }];
let lands: string, other: string;

export async function nameAuthority(id: string) {
  const c = proposeParcelPolicyChange({ patch: { authorityId: id }, reason: 'The Lands ministry keeps the cadastre' }, 'Admin 1');
  if ('error' in c) throw new Error(c.error);
  const p = decideParcelPolicyChange(c.id, 'confirm', 'Admin 2');
  if ('error' in p) throw new Error(p.error);
}

beforeEach(async () => {
  resetParcels();
  applyNation({ iso3: 'KEN', regions: [] });
  const ms = listMinistries();
  lands = ms[0]!.id; other = ms[1]!.id;
  await nameAuthority(lands);
});

const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };

describe('land parcel register', () => {
  it('needs the nation to name its cadastre authority, decided four-eyes by administrators', async () => {
    resetParcels();
    expect(await recordParcel({ parcelId: 'NRB/1/1', geometry: square(NAIROBI.lng, NAIROBI.lat), landUse: 'residential' }, 'Clerk A')).toEqual(expect.objectContaining({ error: expect.stringMatching(/cadastre authority/) }));
    const c = ok(proposeParcelPolicyChange({ patch: { authorityId: lands, overlap: 'flag', toleranceM2: 5 }, reason: 'Lands keeps the cadastre' }, 'Admin 1'));
    expect(decideParcelPolicyChange(c.id, 'confirm', 'Admin 1')).toEqual({ error: expect.stringMatching(/different administrator/) });
    expect(ok(decideParcelPolicyChange(c.id, 'confirm', 'Admin 2'))).toMatchObject({ authorityId: lands, overlap: 'flag', toleranceM2: 5, version: 2, decidedBy: ['Admin 1', 'Admin 2'] });
    expect(proposeParcelPolicyChange({ patch: { idPattern: 'NRB.*' }, reason: 'x' }, 'Admin 1')).toEqual({ error: expect.stringMatching(/start it with \^/) });
    expect(proposeParcelPolicyChange({ patch: { idPattern: '^[0-9]+$', idExample: 'AB' }, reason: 'x' }, 'Admin 1')).toEqual({ error: expect.stringMatching(/does not match/) });
    expect(listAudit().some(e => e.action === 'parcel.policy.confirm')).toBe(true);
  });

  it('records a parcel with its area computed and its region and district from the map, never typed', async () => {
    const r = ok(await recordParcel({ parcelId: 'NAIROBI/BLOCK1/1', geometry: square(NAIROBI.lng, NAIROBI.lat), landUse: 'residential', method: 'field-survey', rights: RIGHTS }, 'Clerk A'));
    expect(r.parcel.areaM2).toBeGreaterThan(9_900);
    expect(r.parcel.areaM2).toBeLessThan(10_100);
    expect(r.parcel.place).toMatchObject({ inside: true, regionCode: 'KE-30' });
    expect(r.parcel.place.districtCode).toMatch(/^KE-30:/);
    expect(r.parcel).toMatchObject({ state: 'proposed', survey: { method: 'field-survey', accuracyM: 0.05 }, id: 'PCL-000001' });
    expect(await recordParcel({ parcelId: 'NAIROBI/BLOCK1/2', geometry: square(NAIROBI.lng + 0.01, NAIROBI.lat), landUse: 'residential', areaM2: 500 }, 'Clerk A')).toEqual(expect.objectContaining({ error: expect.stringMatching(/computed from the outline/) }));
    expect(await recordParcel({ parcelId: 'bad id!', geometry: square(NAIROBI.lng + 0.01, NAIROBI.lat), landUse: 'residential' }, 'Clerk A')).toEqual(expect.objectContaining({ error: expect.stringMatching(/nation's format/) }));
    expect(await recordParcel({ parcelId: 'nairobi/block1/1'.toUpperCase(), geometry: square(NAIROBI.lng + 0.01, NAIROBI.lat), landUse: 'residential' }, 'Clerk A')).toEqual(expect.objectContaining({ error: expect.stringMatching(/already recorded/) }));
  }, 60_000);

  it('refuses outlines that are not valid parcels, and positions outside the nation', async () => {
    const open = { type: 'Polygon', coordinates: [[[36.8, -1.28], [36.801, -1.28], [36.801, -1.279]]] };
    expect(await recordParcel({ parcelId: 'X/1/1', geometry: open, landUse: 'other' }, 'A')).toEqual(expect.objectContaining({ error: expect.stringMatching(/three corners|not closed/) }));
    const unclosed = { type: 'Polygon', coordinates: [[[36.8, -1.28], [36.801, -1.28], [36.801, -1.279], [36.8, -1.279]]] };
    expect(await recordParcel({ parcelId: 'X/1/1', geometry: unclosed, landUse: 'other' }, 'A')).toEqual(expect.objectContaining({ error: expect.stringMatching(/not closed/) }));
    const bowtie = { type: 'Polygon', coordinates: [[[36.8, -1.28], [36.801, -1.279], [36.801, -1.28], [36.8, -1.279], [36.8, -1.28]]] };
    expect(await recordParcel({ parcelId: 'X/1/1', geometry: bowtie, landUse: 'other' }, 'A')).toEqual(expect.objectContaining({ error: expect.stringMatching(/crosses itself/) }));
    expect(await recordParcel({ parcelId: 'X/1/1', geometry: square(2.35, 48.85), landUse: 'other' }, 'A')).toEqual(expect.objectContaining({ error: expect.stringMatching(/outside the nation/) }));
    expect(await recordParcel({ parcelId: 'X/1/1', geometry: { type: 'Point', coordinates: [36.8, -1.28] }, landUse: 'other' }, 'A')).toEqual(expect.objectContaining({ error: expect.stringMatching(/Polygon or MultiPolygon/) }));
  }, 60_000);

  it('is published by a different official, and every change is a version', async () => {
    const r = ok(await recordParcel({ parcelId: 'NRB/2/1', geometry: square(NAIROBI.lng, NAIROBI.lat), landUse: 'residential', rights: RIGHTS }, 'Clerk A'));
    expect(await actOnParcel(r.parcel.id, { action: 'publish' }, 'Clerk A')).toEqual({ error: expect.stringMatching(/different official/) });
    const pub = ok(await actOnParcel(r.parcel.id, { action: 'publish' }, 'Registrar B'));
    expect(pub).toMatchObject({ state: 'published', publishedBy: 'Registrar B' });
    // A change to a published parcel waits for a second official.
    const amended = ok(await actOnParcel('NRB/2/1', { action: 'amend', landUse: 'commercial', reason: 'Change of user approved' }, 'Clerk A'));
    expect(amended).toMatchObject({ landUse: 'residential', pending: { landUse: 'commercial', proposedBy: 'Clerk A' } });
    expect(await actOnParcel(r.parcel.id, { action: 'confirm-amend' }, 'Clerk A')).toEqual({ error: expect.stringMatching(/different official/) });
    const done = ok(await actOnParcel(r.parcel.id, { action: 'confirm-amend' }, 'Registrar B'));
    expect(done.landUse).toBe('commercial');
    expect(done.pending).toBeUndefined();
    expect(await actOnParcel(r.parcel.id, { action: 'withdraw' }, 'Registrar B')).toEqual({ error: expect.stringMatching(/Say why/) });
    const gone = ok(await actOnParcel(r.parcel.id, { action: 'withdraw', reason: 'Subdivided into NRB/2/2 and NRB/2/3' }, 'Registrar B'));
    expect(gone.state).toBe('withdrawn');
    expect(gone.versions.map(v => v.what)).toEqual(['recorded', 'published', expect.stringMatching(/^changed: Change of user/), expect.stringMatching(/^withdrawn/)]);
    // The id is free again once withdrawn.
    expect('parcel' in ok(await recordParcel({ parcelId: 'NRB/2/1', geometry: square(NAIROBI.lng, NAIROBI.lat), landUse: 'commercial' }, 'Clerk A'))).toBe(true);
  }, 60_000);

  it('refuses or flags an overlap with a published parcel as the policy says; neighbours sharing an edge do not overlap', async () => {
    const a = ok(await recordParcel({ parcelId: 'NRB/3/1', geometry: square(NAIROBI.lng, NAIROBI.lat), landUse: 'residential' }, 'Clerk A'));
    ok(await actOnParcel(a.parcel.id, { action: 'publish' }, 'Registrar B'));
    const dx = 100 / (111_320 * Math.cos((NAIROBI.lat * Math.PI) / 180));
    // The neighbour to the east shares the whole edge.
    const east = ok(await recordParcel({ parcelId: 'NRB/3/2', geometry: square(NAIROBI.lng + dx, NAIROBI.lat), landUse: 'residential' }, 'Clerk A'));
    expect(east.parcel.overlaps).toEqual([]);
    // Half over the first parcel: refused (the default).
    const over = await recordParcel({ parcelId: 'NRB/3/3', geometry: square(NAIROBI.lng + dx / 2, NAIROBI.lat), landUse: 'residential' }, 'Clerk A');
    expect(over).toEqual(expect.objectContaining({ error: expect.stringMatching(/Overlaps published parcel NRB\/3\/1 by [\d,.]+ m²/) }));
    const area = Number(/by ([\d,.]+) m²/.exec((over as { error: string }).error)![1]!.replace(/,/g, ''));
    expect(area).toBeGreaterThan(4_800);
    expect(area).toBeLessThan(5_200);
    // The nation flags instead: recorded, with the overlap kept on the record.
    const c = ok(proposeParcelPolicyChange({ patch: { overlap: 'flag' }, reason: 'Disputes are resolved after recording' }, 'Admin 1'));
    ok(decideParcelPolicyChange(c.id, 'confirm', 'Admin 2'));
    const flagged = ok(await recordParcel({ parcelId: 'NRB/3/3', geometry: square(NAIROBI.lng + dx / 2, NAIROBI.lat), landUse: 'residential' }, 'Clerk A'));
    expect(flagged.parcel.overlaps).toEqual([expect.objectContaining({ parcelId: 'NRB/3/1' })]);
    expect(flagged.check.warnings.join(' ')).toMatch(/Overlaps/);
    // Checked again at publication: with refuse back on, publishing an overlap is refused.
    const back = ok(proposeParcelPolicyChange({ patch: { overlap: 'refuse' }, reason: 'Back to refusing' }, 'Admin 1'));
    ok(decideParcelPolicyChange(back.id, 'confirm', 'Admin 2'));
    expect(await actOnParcel(flagged.parcel.id, { action: 'publish' }, 'Registrar B')).toEqual({ error: expect.stringMatching(/Overlaps published parcel NRB\/3\/1/) });
    expect(parcelPolicy().overlap).toBe('refuse');
  }, 60_000);

  it('keeps rights and holders out of the public shape and out of the audit chain', async () => {
    const r = ok(await recordParcel({ parcelId: 'NRB/4/1', geometry: square(NAIROBI.lng, NAIROBI.lat), landUse: 'residential', rights: RIGHTS }, 'Clerk A'));
    ok(await actOnParcel(r.parcel.id, { action: 'publish' }, 'Registrar B'));
    const p = getParcel('NRB/4/1')!;
    expect(p.rights[0]).toMatchObject({ rrr: 'right', type: 'ownership', holder: 'Achieng Otieno' });
    const shown = JSON.stringify([publicParcel(p), viewParcel(p, { rights: false }), pageParcels({ state: 'all' }, { limit: 10 })]);
    expect(shown).not.toMatch(/Achieng|12345678|IR 55501|holder/i);
    expect(viewParcel(p, { rights: false })).toMatchObject({ rightsCount: 1, rightsHidden: true });
    expect(viewParcel(p, { rights: true }).rights?.[0]?.holder).toBe('Achieng Otieno');
    expect(JSON.stringify(listAudit())).not.toMatch(/Achieng|12345678/);
    expect(readRights([{ type: 'ownership', holderKind: 'person', holder: 'X', share: '2/3', source: { ref: 'T1' } }, { type: 'ownership', holderKind: 'person', holder: 'Y', share: '2/3', source: { ref: 'T1' } }])).toEqual({ error: expect.stringMatching(/more than one/) });
    expect(readRights([{ type: 'ownership', holderKind: 'person', holder: 'X', source: {} }])).toEqual({ error: expect.stringMatching(/reference of the document/) });
  }, 60_000);

  it('changes its generation with every published change (tile caches key on it)', async () => {
    const before = parcelGeneration();
    const r = ok(await recordParcel({ parcelId: 'NRB/5/1', geometry: square(NAIROBI.lng, NAIROBI.lat), landUse: 'residential' }, 'Clerk A'));
    const mid = parcelGeneration();
    expect(mid).not.toBe(before);
    ok(await actOnParcel(r.parcel.id, { action: 'publish' }, 'Registrar B'));
    expect(parcelGeneration()).not.toBe(mid);
  }, 60_000);

  it('a large parcel reaching into another district or outside the boundary is flagged', async () => {
    const big = await checkParcel({ geometry: square(36.70, -1.32, 9_000), corners: true });
    expect(big.ok).toBe(true);
    expect(big.warnings.join(' ')).toMatch(/Part of the parcel lies in/);
  }, 60_000);
});

describe('loading parcel files', () => {
  it('converts a national grid, checks every row, records nothing on a dry run, and withdraws a load as a whole', async () => {
    const grid = crsByEpsg(21037)!;
    const toGrid = (g: ReturnType<typeof square>) => ({ ...g, coordinates: g.coordinates.map(r => r.map(([x, y]) => grid.fromLonLat([x!, y!]))) });
    const fc = {
      type: 'FeatureCollection', crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::21037' } },
      features: [
        { type: 'Feature', properties: { UPI: 'NRB/9/1', LandUse: 'residential', owner: 'Mwangi Kariuki', share: '1/1', title: 'IR 1' }, geometry: toGrid(square(NAIROBI.lng, NAIROBI.lat)) },
        { type: 'Feature', properties: { UPI: 'NRB/9/2', LandUse: 'farming' }, geometry: toGrid(square(NAIROBI.lng + 0.01, NAIROBI.lat)) },
        { type: 'Feature', properties: { UPI: 'NRB/9/1', LandUse: 'residential' }, geometry: toGrid(square(NAIROBI.lng + 0.02, NAIROBI.lat)) },
        { type: 'Feature', properties: { UPI: 'NRB/9/4', LandUse: 'agricultural' }, geometry: toGrid(square(NAIROBI.lng + 0.03, NAIROBI.lat)) },
      ],
    };
    const text = JSON.stringify(fc);
    const dry = ok(await importParcels({ text, dryRun: true }, 'Clerk A'));
    expect(dry).toMatchObject({ dryRun: true, rows: 4, accepted: 2, crs: { epsg: 21037 } });
    expect(dry.refused).toEqual([{ row: 2, reason: expect.stringMatching(/not a land use/) }, { row: 3, reason: expect.stringMatching(/twice/) }]);
    expect(pageParcels({ state: 'all' }, { limit: 10 }).total).toBe(0);
    const load = ok(await importParcels({ text }, 'Clerk A'));
    expect(load.accepted).toBe(2);
    const p = getParcel('NRB/9/1')!;
    expect(p.rights).toEqual([expect.objectContaining({ holder: 'Mwangi Kariuki', type: 'ownership', share: '1/1', source: expect.objectContaining({ ref: 'IR 1' }) })]);
    expect(p.survey.sourceCrs).toMatchObject({ epsg: 21037 });
    expect(p.areaM2).toBeGreaterThan(9_800);
    expect(p.areaM2).toBeLessThan(10_200);
    expect(p.source).toMatchObject({ kind: 'import', importId: load.id, sha256: load.sha256 });
    const audit = listAudit().find(e => e.action === 'parcel.import')!;
    expect(audit.detail).toMatch(/2 of 4 parcels.*sha256/);
    expect(JSON.stringify(listAudit())).not.toMatch(/Mwangi/);
    expect(withdrawParcelImport(load.id, '', 'Registrar B')).toEqual({ error: expect.stringMatching(/Say why/) });
    expect(ok(withdrawParcelImport(load.id, 'Wrong survey block', 'Registrar B')).withdrawn).toMatchObject({ count: 2 });
    expect(pageParcels({ state: 'current' }, { limit: 10 }).total).toBe(0);
  }, 120_000);

  it('refuses coordinates in metres without a declared system', async () => {
    const fc = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { parcel_id: 'NRB/8/1', land_use: 'residential' }, geometry: { type: 'Polygon', coordinates: [[[257000, 9857000], [257100, 9857000], [257100, 9857100], [257000, 9857000]]] } }] };
    const r = ok(await importParcels({ text: JSON.stringify(fc), dryRun: true }, 'Clerk A'));
    expect(r.refused[0]!.reason).toMatch(/coordinate system/);
    expect(other).toBeTruthy();
  }, 60_000);
});
