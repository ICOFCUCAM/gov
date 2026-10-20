import { describe, it, expect, beforeEach } from 'vitest';
import { approveIntegration } from '@/lib/data/integration-approval.fixture';
import { resetTwin, syncRegister, registerSource, runSource, stateAsOf, setStreamIngest, withdrawRun, listRuns, confirmWithdrawal, type TwinSource, type TwinRun } from './register';
import { setTwinPolicy, resetTwinPolicy } from './policy';
import { registerMetric } from './metrics';
import { staCreate, staDelete, STA_UPDATE_REFUSAL } from './sta-write';
import { staRequest } from './sta';
import { resetReadings, pushedReadingsBetween, readingsStatus } from './readings';
import { STA_WRITE_SCOPE } from './stream';
import { applyNation } from '@/lib/nation/registry';
import { listAudit, registerIntegration } from '@/lib/data/store';

const B = 'https://gov.example/api/twin/sta/v1.1';
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
let n = 0;
/** An integration with these scopes, approved; its key as the client sends it. */
function integration(scopes = [STA_WRITE_SCOPE], approve = true): { id: string; auth: string } {
  const r = ok(registerIntegration({ kind: 'integration', name: `Grid gateway ${++n}`, ownerOrg: 'Energy regulator', contact: 'ops@grid.example', scopes }));
  if (approve) ok(approveIntegration(r.id));
  return { id: r.id, auth: `Bearer ${r.apiKey}` };
}
const DS = "telemetry:grid.load.mombasa";
const NOW = new Date('2026-10-19T08:00:00Z');
const post = (path: string, body: unknown, auth: string | null, now = NOW) => staCreate(B, path.split('/').filter(Boolean), body, auth, now);

let gw: { id: string; auth: string };
let source: TwinSource;
beforeEach(async () => {
  resetTwin(); resetReadings();
  applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
  await syncRegister();
  registerMetric({ by: 'A', id: 'grid.load_mean', label: 'Mean load', unit: 'MW', aggregation: 'sum', period: 'day' });
  registerMetric({ by: 'A', id: 'grid.readings', label: 'Readings', unit: '{readings}', aggregation: 'sum', period: 'day' });
  gw = integration();
  source = ok(registerSource({
    by: 'Grid Officer', name: 'Mombasa load', publisher: 'Energy regulator', kind: 'stream',
    stream: { streamId: 'grid.load.mombasa', entity: 'place:KE-28', unit: 'MW', metrics: [{ metric: 'grid.load_mean', statistic: 'mean' }, { metric: 'grid.readings', statistic: 'count' }], ingest: { integrationId: gw.id } },
  } as Partial<TwinSource> & { by: string })) as TwinSource;
});

describe('SensorThings create on a stream source\'s Datastream', () => {
  it('binds only an existing integration holding sta:write, and readings in the metrics\' unit', () => {
    const reader = integration(['ogc:read']);
    const base = { by: 'G', name: 'X', publisher: 'Y', kind: 'stream' as const };
    const stream = (ingest: unknown, unit = 'MW') => ({ streamId: 'grid.load.x', entity: 'place:KE-28', unit, metrics: [{ metric: 'grid.load_mean', statistic: 'mean' }], ingest });
    expect(registerSource({ ...base, stream: stream({ integrationId: 'IC-NOPE' }) } as never)).toEqual({ error: expect.stringMatching(/No integration IC-NOPE/) });
    expect(registerSource({ ...base, stream: stream({ integrationId: reader.id }) } as never)).toEqual({ error: expect.stringMatching(/does not hold the scope sta:write/) });
    expect(registerSource({ ...base, stream: stream({ integrationId: gw.id }, 'kW') } as never)).toEqual({ error: expect.stringMatching(/Readings in kW cannot record grid.load_mean, counted in MW/) });
    expect(registerSource({ ...base, stream: { ...stream({ integrationId: gw.id }), unit: undefined } } as never)).toEqual({ error: expect.stringMatching(/declares the unit/) });
    expect(listAudit().some(a => a.action === 'twin.source.register' && a.resource === `Twin:${source.id}` && /SensorThings from integration/.test(a.detail ?? ''))).toBe(true);
  });

  it('takes one Observation, on the set or through its Datastream, and answers 201 with its link', () => {
    const a = post('Observations', { Datastream: { '@iot.id': DS }, phenomenonTime: '2026-10-18T06:00:00Z', result: 140.5 }, gw.auth);
    expect(a.status).toBe(201);
    expect(a.headers?.Location).toMatch(/^https:\/\/gov\.example\/api\/twin\/sta\/v1\.1\/Observations\('telemetry:grid\.load\.mombasa~/);
    expect(a.body).toMatchObject({ phenomenonTime: '2026-10-18T06:00:00.000Z', result: 140.5, resultTime: NOW.toISOString() });
    const b = post(`Datastreams('${DS}')/Observations`, { phenomenonTime: '2026-10-18T12:00:00+03:00', result: 150, parameters: { unit: 'MW' } }, gw.auth);
    expect(b.status).toBe(201);
    expect(pushedReadingsBetween('grid.load.mombasa', '2026-10-18T00:00:00Z', '2026-10-19T00:00:00Z', 10).map(r => [r.ts, r.value])).toEqual([['2026-10-18T06:00:00.000Z', 140.5], ['2026-10-18T09:00:00.000Z', 150]]);
    const audit = listAudit().filter(e => e.action === 'twin.stream.readings' && e.resource === `Twin:${source.id}`);
    expect(audit).toHaveLength(2);
    expect(audit[0]!.actor).toMatch(/^Integration Grid gateway/);
    expect(audit[0]!.detail).toMatch(/1 of 1 readings .* via SensorThings · sha256 [0-9a-f]{64}/);
  });

  it('refuses with reasons: no key, wrong key, other streams, bad unit, time and value, repeats', () => {
    const body = { Datastream: { '@iot.id': DS }, phenomenonTime: '2026-10-18T06:00:00Z', result: 1 };
    expect(post('Observations', body, null)).toMatchObject({ status: 401, headers: { 'WWW-Authenticate': expect.stringContaining('sta:write') } });
    expect(post('Observations', body, 'Bearer civ_00000000_' + 'a'.repeat(43)).status).toBe(401);
    const pending = integration([STA_WRITE_SCOPE], false);
    expect(post('Observations', body, pending.auth)).toMatchObject({ status: 403, body: { message: expect.stringMatching(/pending/) } });
    const reader = integration(['ogc:read']);
    expect(post('Observations', body, reader.auth)).toMatchObject({ status: 403, body: { message: expect.stringMatching(/sta:write/) } });
    // Another approved writer, not bound to this source.
    const other = integration();
    expect(post('Observations', body, other.auth)).toMatchObject({ status: 403, body: { message: expect.stringMatching(/may not post readings/) } });
    expect(post('Observations', { ...body, Datastream: { '@iot.id': 'telemetry:grid.none' } }, gw.auth).status).toBe(404);
    expect(post('Observations', { ...body, Datastream: { '@iot.id': 'place:KE-28~population~SRC-1' } }, gw.auth)).toMatchObject({ status: 400, body: { message: expect.stringMatching(/only on a stream's Datastream/) } });
    expect(post("Things('place:KE-28')", { name: 'x' }, gw.auth).status).toBe(405);
    const reason = (b: Record<string, unknown>) => (post('Observations', { Datastream: { '@iot.id': DS }, ...b }, gw.auth).body as { message: string }).message;
    expect(reason({ phenomenonTime: '2026-10-18T06:00:00Z', result: '12' })).toMatch(/result must be a number/);
    expect(reason({ phenomenonTime: '2026-10-18T06:00:00Z', result: Number.NaN })).toMatch(/result must be a number/);
    expect(reason({ result: 1 })).toMatch(/Say when the value was measured/);
    expect(reason({ phenomenonTime: '2026-10-18T06:00:00', result: 1 })).toMatch(/time zone/);
    expect(reason({ phenomenonTime: '2026-10-18T06:00:00Z/2026-10-18T07:00:00Z', result: 1 })).toMatch(/one instant/);
    expect(reason({ phenomenonTime: '2026-10-19T09:00:00Z', result: 1 })).toMatch(/in the future/);
    expect(reason({ phenomenonTime: '2026-06-01T00:00:00Z', result: 1 })).toMatch(/older than the 90 days/);
    expect(reason({ phenomenonTime: '2026-10-18T06:00:00Z', result: 1, parameters: { unit: 'kW' } })).toMatch(/"kW" is not the stream's unit \(MW\)/);
    expect(post('Observations', body, gw.auth).status).toBe(201);
    // A repeated delivery is a duplicate, never a second reading or an overwrite.
    expect(post('Observations', body, gw.auth)).toMatchObject({ status: 409, body: { message: expect.stringMatching(/already held/) } });
    expect(post('Observations', { ...body, result: 2 }, gw.auth)).toMatchObject({ status: 409, body: { message: expect.stringMatching(/not overwritten/) } });
    expect(readingsStatus('grid.load.mombasa').readings).toBe(1);
    expect(listAudit().some(e => e.action === 'twin.stream.readings' && e.outcome === 'error' && /refused, first: The result must be a number/.test(e.detail ?? ''))).toBe(true);
  });

  it('takes a Data Array (CreateObservations): a link per reading, "error" with the reason for those refused', () => {
    const r = post('CreateObservations', [{
      Datastream: { '@iot.id': DS }, components: ['phenomenonTime', 'result'], 'dataArray@iot.count': 4,
      dataArray: [['2026-10-17T00:00:00Z', 100], ['2026-10-17T12:00:00Z', 120], ['2026-10-17T13:00:00Z', 'x'], ['2026-10-17T18:00:00Z', 110]],
    }, { Datastream: { '@iot.id': 'telemetry:grid.none' }, components: ['phenomenonTime', 'result'], dataArray: [['2026-10-17T00:00:00Z', 1]] }], gw.auth);
    expect(r.status).toBe(201);
    const links = r.body as string[];
    expect(links).toHaveLength(5);
    expect(links.filter(l => l === 'error')).toHaveLength(2);
    expect(links[2]).toBe('error');
    expect(links[0]).toMatch(/Observations\('telemetry:grid\.load\.mombasa~/);
    expect(JSON.parse(r.headers!['X-Refused']!)).toEqual([{ index: 2, reason: expect.stringMatching(/must be a number/) }, { index: 4, reason: expect.stringMatching(/No twin stream source receives readings/) }]);
    expect(post('CreateObservations', [{ Datastream: { '@iot.id': DS }, components: ['phenomenonTime', 'result', 'FeatureOfInterest/id'], dataArray: [['2026-10-17T01:00:00Z', 1, 'x']] }], gw.auth).body).toEqual(['error']);
    expect(post('CreateObservations', {}, gw.auth).status).toBe(400);
  });

  it('becomes observations only through the stream\'s daily run, and refuses readings for days already recorded', async () => {
    post('CreateObservations', [{ Datastream: { '@iot.id': DS }, components: ['phenomenonTime', 'result'],
      dataArray: [['2026-10-17T00:00:00Z', 100], ['2026-10-17T12:00:00Z', 120], ['2026-10-18T00:00:00Z', 90], ['2026-10-18T06:00:00Z', 110], ['2026-10-19T07:00:00Z', 50]] }], gw.auth);
    // Readings are not observations.
    expect(stateAsOf({ metric: 'grid.load_mean' })).toEqual([]);
    // No substrate: the run reads the pushed readings (PLATFORM_TELEMETRY).
    const run = ok(await runSource(source.id, { by: 'scheduler', deps: { now: NOW } })) as TwinRun;
    expect(run).toMatchObject({ status: 'ok', accepted: 4, stream: { streamId: 'grid.load.mombasa', days: 2, samples: 4 } });
    expect(stateAsOf({ metric: 'grid.load_mean', entityId: 'place:KE-28', asOf: '2026-10-18T12:00:00Z', knownAt: '2026-10-19T09:00:00Z' })[0]).toMatchObject({ value: 100, unit: 'MW', validFrom: '2026-10-18', runId: run.id });
    expect(stateAsOf({ metric: 'grid.readings', entityId: 'place:KE-28', asOf: '2026-10-17T12:00:00Z', knownAt: '2026-10-19T09:00:00Z' })[0]).toMatchObject({ value: 2 });
    // The 18th is recorded: a late reading for it would never count, so it is refused.
    const late = post('Observations', { Datastream: { '@iot.id': DS }, phenomenonTime: '2026-10-18T20:00:00Z', result: 1 }, gw.auth, new Date('2026-10-19T08:30:00Z'));
    expect(late).toMatchObject({ status: 400, body: { message: expect.stringMatching(/2026-10-18 is already recorded as observations/) } });
    // Withdrawing the run opens those days again.
    ok(withdrawRun(run.id, 'Grid Officer', 'gateway clock was wrong'));
    expect(post('Observations', { Datastream: { '@iot.id': DS }, phenomenonTime: '2026-10-18T20:00:00Z', result: 1 }, gw.auth, new Date('2026-10-19T08:30:00Z')).status).toBe(201);
  });

  it('serves the stream and its readings through SensorThings reads, without a substrate', async () => {
    post('Observations', { Datastream: { '@iot.id': DS }, phenomenonTime: '2026-10-18T06:00:00Z', result: 140.5 }, gw.auth);
    const ds = await staRequest(B, [`Datastreams('${DS}')`], new URLSearchParams(), { signedIn: false });
    expect(ds).toMatchObject({ status: 200, body: { '@iot.id': DS, unitOfMeasurement: { symbol: 'MW' } } });
    const obs = await staRequest(B, [`Datastreams('${DS}')`, 'Observations'], new URLSearchParams(), { signedIn: false });
    expect((obs.body as { value: { result: number }[] }).value.map(o => o.result)).toEqual([140.5]);
  });

  it('is unbound by an official (audited), after which posts are refused', () => {
    expect(setStreamIngest(source.id, { ingest: null, by: '' })).toEqual({ error: expect.stringMatching(/Name the official/) });
    ok(setStreamIngest(source.id, { ingest: null, by: 'Grid Officer' }));
    expect(listAudit().some(e => e.action === 'twin.source.ingest' && /Stops receiving/.test(e.detail ?? ''))).toBe(true);
    expect(post('Observations', { Datastream: { '@iot.id': DS }, phenomenonTime: '2026-10-18T06:00:00Z', result: 1 }, gw.auth).status).toBe(404);
    ok(setStreamIngest(source.id, { ingest: { integrationId: gw.id }, by: 'Grid Officer' }));
    expect(post('Observations', { Datastream: { '@iot.id': DS }, phenomenonTime: '2026-10-18T06:00:00Z', result: 1 }, gw.auth).status).toBe(201);
  });
});

describe('SensorThings delete (withdrawal) and update of readings', () => {
  const del = (id: string, reason: string | undefined, auth: string | null, now = NOW) => staDelete([`Observations('${id}')`], reason, auth, now);
  const idOf = (r: { body: unknown }) => (r.body as { '@iot.id': string })['@iot.id'];
  const audits = (action: string) => listAudit().filter(e => e.action === action);

  it('withdraws a reading not yet counted: kept on record, gone from reads, not counted by the run', async () => {
    const a = post('Observations', { Datastream: { '@iot.id': DS }, phenomenonTime: '2026-10-18T06:00:00Z', result: 999 }, gw.auth);
    post('Observations', { Datastream: { '@iot.id': DS }, phenomenonTime: '2026-10-18T07:00:00Z', result: 100 }, gw.auth);
    const r = del(idOf(a), 'gateway sent a test value', gw.auth);
    expect(r).toMatchObject({ status: 200, body: { withdrawn: { by: expect.stringMatching(/^Integration Grid gateway/), reason: 'gateway sent a test value' } } });
    expect(readingsStatus('grid.load.mombasa')).toMatchObject({ readings: 1, withdrawn: 1 });
    const obs = await staRequest(B, [`Datastreams('${DS}')`, 'Observations'], new URLSearchParams(), { signedIn: false });
    expect((obs.body as { value: { result: number }[] }).value.map(o => o.result)).toEqual([100]);
    expect((await staRequest(B, [`Observations('${idOf(a)}')`], new URLSearchParams(), { signedIn: false })).status).toBe(404);
    // A correction at the same instant is a new reading.
    expect(post('Observations', { Datastream: { '@iot.id': DS }, phenomenonTime: '2026-10-18T06:00:00Z', result: 140 }, gw.auth).status).toBe(201);
    const run = ok(await runSource(source.id, { by: 'scheduler', deps: { now: NOW } })) as TwinRun;
    expect(run.stream).toMatchObject({ samples: 2 });
    expect(stateAsOf({ metric: 'grid.load_mean', entityId: 'place:KE-28', asOf: '2026-10-18T12:00:00Z', knownAt: '2026-10-19T09:00:00Z' })[0]).toMatchObject({ value: 120 });
    expect(audits('twin.stream.reading.withdraw')[0]!.detail).toMatch(/withdrawn · gateway sent a test value · not yet counted by a run/);
    // Withdrawn once only.
    expect(del(idOf(a), 'again', gw.auth).status).toBe(409);
  });

  it('for a day already recorded, proposes the run\'s withdrawal to the officials (never withdraws it itself)', async () => {
    setTwinPolicy({ fourEyesWithdrawal: false }, 'Admin');
    const a = post('Observations', { Datastream: { '@iot.id': DS }, phenomenonTime: '2026-10-18T06:00:00Z', result: 999 }, gw.auth);
    const run = ok(await runSource(source.id, { by: 'scheduler', deps: { now: NOW } })) as TwinRun;
    const r = del(idOf(a), undefined, gw.auth, new Date('2026-10-19T09:00:00Z'));
    expect(r).toMatchObject({ status: 200, body: { run: run.id, runWithdrawal: 'proposed', withdrawn: { reason: 'No reason given (SensorThings DELETE)', run: run.id } } });
    // Even with one-official withdrawal, a gateway only proposes: the facts stand until an official confirms.
    const live = listRuns(source.id).find(x => x.id === run.id)!;
    expect(live.withdrawn).toBeUndefined();
    expect(live.withdrawalProposed).toMatchObject({ by: expect.stringMatching(/^Integration Grid gateway/) });
    expect(stateAsOf({ metric: 'grid.load_mean', entityId: 'place:KE-28', asOf: '2026-10-18T12:00:00Z', knownAt: '2026-10-19T09:10:00Z' })).toHaveLength(1);
    ok(confirmWithdrawal(run.id, 'Grid Officer', new Date('2026-10-19T09:30:00Z')));
    expect(stateAsOf({ metric: 'grid.load_mean', entityId: 'place:KE-28', asOf: '2026-10-18T12:00:00Z', knownAt: '2026-10-19T09:35:00Z' })).toEqual([]);
    // The next run does not count the withdrawn reading.
    post('Observations', { Datastream: { '@iot.id': DS }, phenomenonTime: '2026-10-18T06:00:00Z', result: 140 }, gw.auth, new Date('2026-10-19T09:40:00Z'));
    ok(await runSource(source.id, { by: 'scheduler', deps: { now: new Date('2026-10-19T10:00:00Z') } }));
    expect(stateAsOf({ metric: 'grid.load_mean', entityId: 'place:KE-28', asOf: '2026-10-18T12:00:00Z', knownAt: '2026-10-19T10:05:00Z' })[0]).toMatchObject({ value: 140 });
    expect(audits('twin.run.withdraw.propose').some(e => /withdrawn by its sender/.test(e.detail ?? ''))).toBe(true);
    resetTwinPolicy();
  });

  it('refuses others: no key, another integration, the twin\'s own facts, other entities; PATCH is 405', () => {
    const a = post('Observations', { Datastream: { '@iot.id': DS }, phenomenonTime: '2026-10-18T06:00:00Z', result: 1 }, gw.auth);
    expect(del(idOf(a), 'x', null).status).toBe(401);
    expect(del(idOf(a), 'x', integration().auth)).toMatchObject({ status: 403, body: { message: expect.stringMatching(/Only the integration bound/) } });
    expect(del(idOf(a), 'x', integration(['ogc:read']).auth).status).toBe(403);
    expect(del('place:KE-28~grid.load_mean~SRC-1~2026-10-18', 'x', gw.auth)).toMatchObject({ status: 405, body: { message: expect.stringMatching(/withdrawn by an official/) } });
    expect(del(`${DS}~00000000-0000-4000-8000-000000000000`, 'x', gw.auth).status).toBe(404);
    expect(staDelete([`Things('place:KE-28')`], 'x', gw.auth, NOW).status).toBe(405);
    expect(STA_UPDATE_REFUSAL).toMatch(/correction sent as a new Observation/);
    expect(readingsStatus('grid.load.mombasa')).toMatchObject({ readings: 1, withdrawn: 0 });
  });

  it('declares delete-entity and tasking, and explains what each class covers, in the service root', async () => {
    const root = (await staRequest(B, [], new URLSearchParams(), { signedIn: false })).body as { serverSettings: { conformance: string[]; 'civicos:conformanceNotes': Record<string, string> } };
    expect(root.serverSettings.conformance).toEqual(expect.arrayContaining([
      'http://www.opengis.net/spec/iot_sensing/1.1/req/create-update-delete/delete-entity',
      'http://www.opengis.net/spec/iot_tasking/1.0/req/tasking-core',
    ]));
    expect(root.serverSettings.conformance.some(c => /update-entity/.test(c))).toBe(false);
    expect(root.serverSettings['civicos:conformanceNotes']['create-update-delete']).toMatch(/update-entity is not offered/);
  });
});
