// The postgres backend against a real Postgres (16): skipped unless
// TEST_DATABASE_URL names a server this test may create databases on.
//   eval "$(scripts/test-postgres.sh start)" && npx vitest run src/lib/data/repo
// Each run creates its own database and drops it afterwards. A second
// instance is a second backend with its own read model (root object), on its
// own connection pool: what a second server would be.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import type { AuditEntry } from '@/lib/api/types';
import type { TwinDb } from '@/lib/twin/db';
import type { Facility } from '@/lib/data/facilities';
import type { BoundaryVersion } from '@/lib/data/boundaries';
import type { Parcel } from '@/lib/data/parcels';
import type { Observation } from '@/lib/twin/register';
import { resetTwin, syncRegister, registerSource, runSource, withdrawRun, linkKey, stateAsOf } from '@/lib/twin/register';
import { applyNation } from '@/lib/nation/registry';
import { recordAudit, listAudit, verifyAuditChain, auditHashV2 } from '@/lib/data/store';
import { resetFacilities } from '@/lib/data/facilities';
import { resetBoundaries } from '@/lib/data/boundaries';
import { resetParcels } from '@/lib/data/parcels';
import { useBackend, type Backend } from '.';
import { connect, startRecords, postgresSnapshotAdapter, type Records, type Sql } from './postgres';

const URL_ = process.env.TEST_DATABASE_URL;
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
const G = globalThis as unknown as Record<string, unknown>;
type Root = Record<string, unknown>;
const chainOf = (r: Root) => ((r.__civicos as { audit: AuditEntry[] }).audit);
const twinOf = (r: Root) => r.__civicosTwin as TwinDb;
const facilitiesOf = (r: Root) => (r.__civicosFacilities as { facilities: Facility[]; seq: number });
const boundariesOf = (r: Root) => (r.__civicosBoundaries as { versions: BoundaryVersion[]; seq: number });
const parcelsOf = (r: Root) => ((r.__civicosParcels ??= { parcels: [], seq: 1 }) as { parcels: Parcel[]; seq: number });
const byKey = (o: Observation) => `${o.entityId}|${o.metric}`;
const sorted = (l: Observation[]) => [...l].sort((a, b) => byKey(a).localeCompare(byKey(b)));

/** Append an audit entry through a backend bound to a root, as recordAudit does. */
function appendVia(b: Backend, root: Root, action: string): AuditEntry {
  const repo = b.audit(() => chainOf(root));
  const prev = repo.head();
  const base = { id: `AU-T${Math.random().toString(16).slice(2, 12)}`, at: new Date().toISOString(), actor: 'Instance test', action, resource: 'Test:1', outcome: 'ok', detail: undefined, seq: (prev?.seq ?? 0) + 1, prevHash: prev?.hash ?? null };
  const e: AuditEntry = { ...base, alg: 'sha256-v2', hash: auditHashV2(base) };
  repo.append(e);
  return e;
}
const chainIntact = (chain: AuditEntry[]) => chain.every((e, i) => i === 0 || (e.prevHash === chain[i - 1]!.hash && e.seq === chain[i - 1]!.seq + 1 && (e.alg !== 'sha256-v2' || auditHashV2(e) === e.hash)));

const facility = (id: string, lng: number, lat: number): Facility => ({
  id, name: `Clinic ${id}`, category: 'health-clinic', ownerId: 'min-health', ids: { national: `0190-${id}` }, status: 'operational', sensitivity: 'public',
  location: { lng, lat, method: 'typed', accuracyM: 30 }, place: { inside: true, regionCode: 'KE-30' }, state: 'proposed', proposedBy: 'Officer A', proposedAt: new Date().toISOString(),
  certification: { required: ['institution'], stamps: [], state: 'awaiting' }, source: { kind: 'form' }, versions: [],
} as Facility);
const boundary = (id: string): BoundaryVersion => ({
  id, iso3: 'KEN', level: 1, n: 1, source: { publisher: 'Survey of Kenya', licence: 'CC BY 4.0' }, validFrom: '2024-01-01', sha256: 'f'.repeat(64), fileSha256: 'e'.repeat(64), format: 'geojson',
  units: [{ code: 'KE-30', name: 'Nairobi City', geometry: { type: 'Polygon', coordinates: [[[36.6, -1.45], [37.1, -1.45], [37.1, -1.15], [36.6, -1.15], [36.6, -1.45]]] }, lng: 36.85, lat: -1.3 }],
  check: { errors: [], warnings: [], summary: { units: 1, matched: 1, missing: [], unofficial: [], areaKm2: 700, rewound: 0, fewer: false } }, state: 'proposed', proposedBy: 'Mapping officer', proposedAt: new Date().toISOString(),
} as unknown as BoundaryVersion);

const parcel = (id: string, lng: number, lat: number): Parcel => ({
  id, parcelId: `NRB/T/${id}`, geometry: { type: 'MultiPolygon', coordinates: [[[[lng, lat], [lng + 0.001, lat], [lng + 0.001, lat + 0.001], [lng, lat + 0.001], [lng, lat]]]] },
  areaM2: 12_300, bbox: [lng, lat, lng + 0.001, lat + 0.001], survey: { method: 'field-survey', accuracyM: 0.05 },
  place: { inside: true, regionCode: 'KE-30', region: 'Nairobi City', at: [lng + 0.0005, lat + 0.0005] }, landUse: 'residential',
  rights: [{ rrr: 'right', type: 'ownership', holderKind: 'person', holder: 'Holder Privatename', source: { kind: 'title', ref: 'IR 1' } }],
  state: 'proposed', recordedBy: 'Clerk A', recordedAt: new Date().toISOString(), overlaps: [], source: { kind: 'form' }, versions: [],
});

describe.skipIf(!URL_)('postgres backend (TEST_DATABASE_URL)', { timeout: 60_000 }, () => {
  let admin: Sql, dbUrl: string, dbName: string;
  const opened: Records[] = [];
  const pools: Sql[] = [];
  let prevBackend: Backend;
  const start = async (root: Root, extra: Partial<Parameters<typeof startRecords>[0]> = {}): Promise<Records> => {
    const sql = await connect(dbUrl, { max: 3 });
    pools.push(sql);
    const r = await startRecords({ sql, instance: `test-${opened.length}-${Math.random().toString(16).slice(2, 6)}`, root, journalDir: null, pollMs: 60_000, blockSize: { facility: 4, twin: 4 }, ...extra });
    opened.push(r);
    return r;
  };

  beforeAll(async () => {
    admin = await connect(URL_!, { max: 1 });
    dbName = `civicos_test_${process.pid}_${Date.now()}`;
    await admin.unsafe(`create database ${dbName}`);
    const u = new URL(URL_!);
    u.pathname = `/${dbName}`;
    dbUrl = u.toString();
    resetTwin(); resetFacilities(); resetBoundaries(); resetParcels();
    chainOf(G as Root).length = 0;
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
  });
  afterAll(async () => {
    for (const r of opened) await r.stop();
    useBackend(prevBackend ?? null);
    for (const s of pools) await s.end?.({ timeout: 2 });
    await admin.unsafe(`drop database if exists ${dbName} with (force)`);
    await admin.end?.({ timeout: 2 });
  });

  it('writes through, and a new read model loads the same records back (restart)', async () => {
    const a = await start(G as Root);
    prevBackend = useBackend(a.backend);
    expect(a.status()).toMatchObject({ adapter: 'postgres', queueDepth: 0 });

    await syncRegister();
    recordAudit('Registrar', 'test.write', 'Test:1', 'ok', 'first');
    const s = ok(registerSource({ by: 'Director', name: 'Census', publisher: 'KNBS', kind: 'csv-upload', mapping: { entity: 'region', value: 'value', metric: { fixed: 'population' }, unit: { fixed: 'persons' }, date: { column: 'year' } } }));
    const r1 = ok(await runSource(s.id, { by: 'Director', csv: 'region,value,year\nMombasa,900000,2009\nNairobi City,3100000,2009\nKisumu,960000,2009\n', deps: { now: new Date('2015-01-01T00:00:00Z') } }));
    const r2 = ok(await runSource(s.id, { by: 'Director', csv: 'region,value,year\nMombasa,1208333,2019\nNairobi City,4397073,2019\nKisumu,1155574,2019\n', deps: { now: new Date('2021-01-01T00:00:00Z') } }));
    ok(await runSource(s.id, { by: 'Director', csv: 'region,value,year\nMombasa,1300000,2019\n', deps: { now: new Date('2022-01-01T00:00:00Z') } }));
    ok(withdrawRun(r2.id, 'Director', 'Wrong file', new Date('2023-01-01T00:00:00Z')));
    ok(linkKey('place:KE-28', 'knbs', '001', 'Director'));
    expect(r1.id).not.toBe(r2.id);
    const fac = a.backend.facilities(() => facilitiesOf(G as Root));
    const f = facility(`FAC-${String(fac.nextSeq()).padStart(5, '0')}`, 36.82, -1.29);
    fac.add(f);
    f.state = 'published'; f.publishedBy = 'Officer B';
    fac.save(f);
    const bnd = a.backend.boundaries(() => boundariesOf(G as Root));
    const v = boundary(`bnd-${String(bnd.nextSeq()).padStart(4, '0')}`);
    bnd.add(v);
    v.state = 'published'; v.publishedBy = 'Second official';
    bnd.save(v);
    expect(await a.drain()).toBe(true);
    expect(a.status().queueDepth).toBe(0);
    expect(verifyAuditChain().ok).toBe(true);

    // Restart: a new read model loads from the tables alone.
    const fresh: Root = {};
    const c = await start(fresh);
    expect(chainOf(fresh)).toEqual(chainOf(G as Root));
    expect(chainIntact(chainOf(fresh))).toBe(true);
    const tw = twinOf(fresh), mine = twinOf(G as Root);
    expect(tw.entities).toEqual(mine.entities);
    expect(new Set(tw.keys.map(k => `${k.system}:${k.key}>${k.entityId}`))).toEqual(new Set(mine.keys.map(k => `${k.system}:${k.key}>${k.entityId}`)));
    expect(tw.sources).toEqual(mine.sources);
    expect(tw.runs).toEqual(mine.runs);
    expect(sorted(tw.observations)).toEqual(sorted(mine.observations));
    expect(facilitiesOf(fresh).facilities).toEqual([f].map(x => JSON.parse(JSON.stringify(x))));
    expect(boundariesOf(fresh).versions).toEqual([JSON.parse(JSON.stringify(v))]);
    expect(await c.stateAsOf({ metric: 'population' })).toEqual(sorted(stateAsOf({ metric: 'population' })));
  });

  it('answers the bitemporal as-of query in SQL exactly as the read model does', async () => {
    const a = opened[0]!;
    const twin = a.backend.twin(() => twinOf(G as Root));
    // Random histories: values true at random dates, recorded at random times, some intervals, some withdrawn.
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    const date = (y0: number) => new Date(Date.UTC(y0 + Math.floor(rnd() * 10), Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28)));
    for (let run = 0; run < 12; run++) {
      const runId = `RUN-P${run}`;
      const recordedAt = date(2012).toISOString();
      twin.addRun({ id: runId, sourceId: 'SRC-P', at: recordedAt, by: 'Property test', status: 'ok', rows: 0, accepted: 0, rejected: [] });
      const list: Observation[] = [];
      for (let i = 0; i < 25; i++) {
        const from = date(2005).toISOString().slice(0, 10);
        const to = rnd() < 0.3 ? date(2012).toISOString().slice(0, 10) : undefined;
        list.push({ entityId: ['place:KE-28', 'place:KE-30', 'place:KE-42'][Math.floor(rnd() * 3)]!, metric: rnd() < 0.5 ? 'p.alpha' : 'p.beta', value: Math.round(rnd() * 1e6) / 100, unit: '1', validFrom: from, ...(to && to > from ? { validTo: to } : {}), recordedAt, sourceId: 'SRC-P', runId });
      }
      twin.addObservations(list);
      if (rnd() < 0.3) twin.supersedeRun(runId, date(2016).toISOString());
    }
    expect(await a.drain()).toBe(true);
    for (let k = 0; k < 40; k++) {
      const asOf = date(2008).toISOString();
      const knownAt = rnd() < 0.5 ? date(2012).toISOString() : undefined;
      const metric = rnd() < 0.7 ? (rnd() < 0.5 ? 'p.alpha' : 'p.beta') : undefined;
      const q = { asOf, ...(knownAt ? { knownAt } : {}), ...(metric ? { metric } : {}) };
      expect(sorted(await a.stateAsOf(q)), JSON.stringify(q)).toEqual(sorted(stateAsOf(q)));
    }
  });

  it('two instances see each other\'s writes through the outbox, and the audit chain stays one chain', async () => {
    const a = opened[0]!;
    const rootB: Root = {};
    const b = await start(rootB);
    const before = chainOf(G as Root).length;

    // A writes; B follows.
    recordAudit('Registrar', 'test.from-a', 'Test:a', 'ok');
    const facA = a.backend.facilities(() => facilitiesOf(G as Root));
    const fa = facility(`FAC-${String(facA.nextSeq()).padStart(5, '0')}`, 39.66, -4.04);
    facA.add(fa);
    expect(await a.drain()).toBe(true);
    expect(await b.pull()).toBeGreaterThan(0);
    expect(chainOf(rootB).at(-1)?.action).toBe('test.from-a');
    expect(facilitiesOf(rootB).facilities.map(x => x.id)).toContain(fa.id);

    // B writes; A follows. Record numbers never collide across instances.
    const facB = b.backend.facilities(() => facilitiesOf(rootB));
    const fb = facility(`FAC-${String(facB.nextSeq()).padStart(5, '0')}`, 34.76, -0.09);
    expect(fb.id).not.toBe(fa.id);
    facB.add(fb);
    appendVia(b.backend, rootB, 'test.from-b');
    expect(await b.drain()).toBe(true);
    await a.pull();
    expect(facilitiesOf(G as Root).facilities.map(x => x.id)).toContain(fb.id);
    expect(listAudit()[0]!.action).toBe('test.from-b');

    // Both append before either commits: the second to commit moves its entry up the chain.
    recordAudit('Registrar', 'test.race-a', 'Test:a', 'ok');
    appendVia(b.backend, rootB, 'test.race-b');
    expect(await b.drain()).toBe(true);
    expect(await a.drain()).toBe(true);
    await b.pull(); await a.pull();
    const ca = chainOf(G as Root), cb = chainOf(rootB);
    expect(ca.length).toBe(before + 4);
    expect(ca.map(e => e.hash)).toEqual(cb.map(e => e.hash));
    expect(chainIntact(ca)).toBe(true);
    expect(verifyAuditChain().ok).toBe(true);
    // Whichever committed second was moved up the chain, re-hashed, and both instances agree.
    expect(ca.slice(-2).map(e => e.action).sort()).toEqual(['test.race-a', 'test.race-b']);
    expect(a.status().rebased + b.status().rebased).toBeGreaterThanOrEqual(1);
    // Many rounds of both appending at once: still one chain, the same on both.
    for (let round = 0; round < 15; round++) {
      recordAudit('Registrar', `test.burst-a${round}`, 'Test:a', 'ok');
      appendVia(b.backend, rootB, `test.burst-b${round}`);
      if (round % 3 === 0) recordAudit('Registrar', `test.burst-a${round}x`, 'Test:a', 'ok');
      await Promise.all([a.drain(), b.drain()]);
    }
    await b.pull(); await a.pull();
    expect(chainOf(G as Root).map(e => e.hash)).toEqual(chainOf(rootB).map(e => e.hash));
    expect(chainIntact(chainOf(rootB))).toBe(true);
    expect(chainOf(G as Root).length).toBe(before + 4 + 35);
    // The table holds the same chain.
    const rows = await a.sql.unsafe(`select hash from civicos.audit_entry order by seq`);
    expect(rows.map(r => r.hash)).toEqual(chainOf(G as Root).map(e => e.hash));
  });

  it('refuses changes to the audit chain and to observations in the database itself', async () => {
    const a = opened[0]!;
    await expect(a.sql.unsafe(`update civicos.audit_entry set actor = 'forged' where seq = 1`)).rejects.toThrow(/append-only/);
    await expect(a.sql.unsafe(`delete from civicos.audit_entry`)).rejects.toThrow(/append-only/);
    await expect(a.sql.unsafe(`truncate civicos.audit_entry`)).rejects.toThrow(/append-only/);
    await expect(a.sql.unsafe(`update civicos.twin_observation set value = 1 where id = (select min(id) from civicos.twin_observation)`)).rejects.toThrow(/never changed/);
    await expect(a.sql.unsafe(`insert into civicos.audit_entry (seq, id, at, actor, action, resource, outcome, hash) values (100000, 'AU-X', 'now', 'x', 'y', 'z', 'ok', 'abc')`)).rejects.toThrow(/does not chain/);
  });

  it('keeps geometry as PostGIS columns where available, else as longitude/latitude and bounding boxes', async () => {
    const a = opened[0]!;
    const unit = (await a.sql.unsafe(`select min_lng, min_lat, max_lng, max_lat from civicos.boundary_unit limit 1`))[0]!;
    expect([unit.min_lng, unit.min_lat, unit.max_lng, unit.max_lat].map(Number)).toEqual([36.6, -1.45, 37.1, -1.15]);
    const cols = (await a.sql.unsafe(`select column_name from information_schema.columns where table_schema = 'civicos' and table_name in ('facility', 'boundary_unit')`)).map(r => String(r.column_name));
    if (a.status().postgis) expect(cols).toEqual(expect.arrayContaining(['geog', 'geom', 'valid_as_loaded']));
    else expect(cols).not.toContain('geog');
    const near = await a.sql.unsafe(`select id from civicos.facility where lng between 36.7 and 36.9 and lat between -1.4 and -1.2`);
    expect(near.length).toBeGreaterThan(0);
  });

  it('keeps land parcels in civicos.parcel: written through, followed by another instance, the outbox carrying no rights', async () => {
    const a = opened[0]!;
    const rootB: Root = {};
    const b = await start(rootB);
    const repoA = a.backend.parcels(() => parcelsOf(G as Root));
    const p = parcel(`PCL-${String(repoA.nextSeq()).padStart(6, '0')}`, 36.81, -1.29);
    repoA.add(p);
    p.state = 'published'; p.publishedBy = 'Registrar B';
    repoA.save(p);
    expect(await a.drain()).toBe(true);
    const row = (await a.sql.unsafe(`select parcel_id, state, land_use, region_code, area_m2, min_lng, max_lat, doc from civicos.parcel where id = $1`, [p.id]))[0]!;
    expect(row).toMatchObject({ parcel_id: p.parcelId, state: 'published', land_use: 'residential', region_code: 'KE-30' });
    expect(Number(row.min_lng)).toBe(36.81);
    // The outbox tells other instances which parcel changed, never its rights.
    const out = await a.sql.unsafe(`select payload::text as payload from civicos.outbox where topic = 'parcel'`);
    expect(out.length).toBeGreaterThan(0);
    expect(out.map(r => String(r.payload)).join(' ')).not.toMatch(/Privatename|holder/);
    // Another instance follows it from the table.
    await b.pull();
    expect(parcelsOf(rootB).parcels.find(x => x.id === p.id)).toMatchObject({ state: 'published', rights: [expect.objectContaining({ holder: 'Holder Privatename' })] });
    // Record numbers never collide across instances.
    const repoB = b.backend.parcels(() => parcelsOf(rootB));
    expect(`PCL-${String(repoB.nextSeq()).padStart(6, '0')}`).not.toBe(p.id);
    // A restart loads it back.
    const fresh: Root = {};
    await start(fresh);
    expect(parcelsOf(fresh).parcels).toEqual([JSON.parse(JSON.stringify(p))]);
    const cols = (await a.sql.unsafe(`select column_name from information_schema.columns where table_schema = 'civicos' and table_name = 'parcel'`)).map(r => String(r.column_name));
    if (a.status().postgis) {
      expect(cols).toEqual(expect.arrayContaining(['geom', 'valid_as_loaded']));
      const hit = await a.sql.unsafe(`select id from civicos.parcel where st_intersects(geom, st_setsrid(st_makepoint(36.8105, -1.2895), 4326))`);
      expect(hit.map(r => r.id)).toContain(p.id);
    } else expect(cols).not.toContain('geom');
  });

  it('replays a journal left by a crash', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'civicos-journal-'));
    const rootD: Root = {};
    const d = await start(rootD, { journalDir: dir });
    appendVia(d.backend, rootD, 'test.journal');
    await d.stop(); // as if the process died before its flush
    const rootE: Root = {};
    const e = await start(rootE, { journalDir: dir });
    expect(chainOf(rootE).at(-1)?.action).toBe('test.journal');
    expect(chainIntact(chainOf(rootE))).toBe(true);
    expect(e.status().queueDepth).toBe(0);
  });

  it('keeps the other stores as snapshots under the single writer\'s lease', async () => {
    const a = opened[0]!;
    const conflict = (m: string) => Object.assign(new Error(m), { name: 'StateConflictError' });
    const s = postgresSnapshotAdapter(a.sql, conflict);
    expect((await s.lease!('writer-1', 30_000)).acquired).toBe(true);
    expect(await s.lease!('writer-2', 30_000)).toMatchObject({ acquired: false, holder: 'writer-1' });
    expect(await s.save('__civicosTestSnap', '{"v":1}', { writer: 'writer-1', expected: 0 })).toBe(1);
    await expect(s.save('__civicosTestSnap', '{"v":1}', { writer: 'writer-1', expected: 0 })).rejects.toThrow(/another writer/);
    await expect(s.save('__civicosTestSnap', '{"v":1}', { writer: 'writer-2', expected: 1 })).rejects.toThrow(/no longer holds/);
    expect((await s.loadAll()).__civicosTestSnap).toBe('{"v":1}');
    await s.release!('writer-1');
    expect((await s.lease!('writer-2', 30_000)).acquired).toBe(true);
  });
});
