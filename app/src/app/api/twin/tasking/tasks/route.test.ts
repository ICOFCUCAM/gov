// SensorThings Tasking Core end to end through the routes: an administrator
// declares a capability, a signed-in official allowed to task sensors creates a
// task (here and through POST /Tasks of the SensorThings service), the
// executing integration pulls it with its own key and reports its status; the
// platform never executes anything. Officers, typed-in names, keys and other
// integrations are refused.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { resetOfficials, createAccount, sessionSecret } from '@/lib/auth/officials';
import { signClaims } from '@/lib/auth/session-token';
import { resetTwin, syncRegister, registerSource, type TwinSource } from '@/lib/twin/register';
import { registerMetric } from '@/lib/twin/metrics';
import { resetReadings } from '@/lib/twin/readings';
import { resetTasking, declareCapability, listTasks, TASKING_SCOPE } from '@/lib/twin/tasking';
import { staRequest } from '@/lib/twin/sta';
import { STA_WRITE_SCOPE } from '@/lib/twin/stream';
import { applyNation } from '@/lib/nation/registry';
import { listAudit, registerIntegration, setIntegrationStatus } from '@/lib/data/store';
import { apiPermission, mutationRule, canTaskSensor } from '@/lib/auth/roles';

process.env.CIVICOS_SCRYPT_N = '16384';
let cookie: string | undefined;
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => (cookie ? { value: cookie } : undefined) }) }));
const tasks = await import('./route');
const cancel = await import('./[id]/cancel/route');
const caps = await import('../capabilities/route');
const retire = await import('../capabilities/[id]/retire/route');
const executor = await import('../executor/route');
const report = await import('../executor/[id]/route');
const sta = await import('../../sta/v1.1/[...path]/route');

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
const PW = 'correct horse battery';
const B = 'http://localhost/api/twin/sta/v1.1';
let n = 0;
function integration(scopes: string[]): { id: string; auth: string } {
  const r = ok(registerIntegration({ kind: 'integration', name: `River gateway ${++n}`, ownerOrg: 'Water authority', contact: 'ops@water.example', scopes }));
  ok(setIntegrationStatus(r.id, 'approved', 'Admin'));
  return { id: r.id, auth: `Bearer ${r.apiKey}` };
}
async function signInAs(email: string, role: string) {
  const a = await createAccount({ email, name: email.split('@')[0]!, office: 'Water Directorate', password: PW, role }, 'Admin');
  if ('error' in a) throw new Error(a.error);
  const now = Math.floor(Date.now() / 1000);
  cookie = await signClaims({ sub: `local:${a.id}`, name: 'typed', method: 'local', iat: now, exp: now + 600 }, sessionSecret());
}
const json = (url: string, body: unknown, method = 'POST', headers: Record<string, string> = {}) => new NextRequest(url, { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers } });
const get = (url: string, headers: Record<string, string> = {}) => new NextRequest(url, { headers });
const params = <T,>(p: T) => ({ params: Promise.resolve(p) });

let gw: { id: string; auth: string };
let source: TwinSource;
let capId: string;
beforeEach(async () => {
  resetOfficials(); resetTwin(); resetReadings(); resetTasking(); cookie = undefined;
  await createAccount({ email: 'admin@gov.test', name: 'Admin', office: 'Head of Service', password: PW }, null);
  applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Garissa', 'Nairobi City'] });
  await syncRegister();
  registerMetric({ by: 'A', id: 'river.level_max', label: 'Highest river level', unit: 'm', aggregation: 'none', period: 'day' });
  gw = integration([STA_WRITE_SCOPE, TASKING_SCOPE]);
  source = ok(registerSource({
    by: 'Water Officer', name: 'Tana gauge', publisher: 'Water authority', kind: 'stream',
    stream: { streamId: 'river.tana.garissa', entity: 'place:KE-07', unit: 'm', metrics: [{ metric: 'river.level_max', statistic: 'max' }], ingest: { integrationId: gw.id } },
  } as Partial<TwinSource> & { by: string })) as TwinSource;
  capId = ok(declareCapability({
    sourceId: source.id, name: 'Change the sampling interval', integrationId: gw.id, actuator: { name: 'Tana gauge logger' },
    parameters: [{ name: 'intervalSeconds', label: 'Sampling interval', kind: 'number', unit: 's', min: 10, max: 3600 }, { name: 'mode', label: 'Mode', kind: 'choice', choices: ['normal', 'flood'], required: false }],
  }, 'Admin')).id;
});

describe('tasking capabilities', () => {
  it('are declared by an administrator for an approved integration holding sta:task, with checked parameters; audited', async () => {
    const reader = integration(['ogc:read']);
    const base = { sourceId: source.id, name: 'Reboot', integrationId: gw.id, parameters: [{ name: 'now', kind: 'boolean' }] };
    expect(declareCapability({ ...base, integrationId: reader.id }, 'Admin')).toEqual({ error: expect.stringMatching(/does not hold the scope sta:task/) });
    expect(declareCapability({ ...base, parameters: [{ name: '1x', kind: 'number' }] }, 'Admin')).toEqual({ error: expect.stringMatching(/not a parameter name/) });
    expect(declareCapability({ ...base, parameters: [{ name: 'a', kind: 'number', min: 5, max: 1 }] }, 'Admin')).toEqual({ error: expect.stringMatching(/range of a is empty/) });
    expect(declareCapability({ ...base, parameters: [{ name: 'a', kind: 'choice', choices: ['x'] }] }, 'Admin')).toEqual({ error: expect.stringMatching(/at least two values/) });
    expect(declareCapability({ ...base, sourceId: 'SRC-NONE' }, 'Admin')).toEqual({ error: expect.stringMatching(/stream source/) });
    // The route: administrators only.
    await signInAs('officer@gov.test', 'officer');
    expect((await caps.POST(json('http://localhost/api/twin/tasking/capabilities', base))).status).toBe(403);
    await signInAs('admin2@gov.test', 'administrator');
    const r = await caps.POST(json('http://localhost/api/twin/tasking/capabilities', { ...base, by: 'Typed Name' }));
    expect(r.status).toBe(201);
    const made = (await r.json()).capability;
    expect(made).toMatchObject({ declaredBy: 'admin2, Water Directorate', parameters: [{ name: 'now', kind: 'boolean', required: true }] });
    expect(listAudit().some(a => a.action === 'twin.tasking.capability.declare' && /Reboot · executed by River gateway/.test(a.detail ?? ''))).toBe(true);
    // Retired with a reason: no new tasks.
    expect((await retire.POST(json('http://localhost/x', { reason: 'Logger replaced' }), params({ id: made.id }))).status).toBe(200);
    expect((await tasks.POST(json('http://localhost/api/twin/tasking/tasks', { capabilityId: made.id, parameters: { now: true }, reason: 'Hung logger' }))).status).toBe(422);
    expect(mutationRule('/api/twin/tasking/capabilities')).toBe('admin');
    expect(apiPermission({ role: 'signatory' }, 'POST', '/api/twin/tasking/capabilities')).toMatch(/administrator/);
  });

  it('appear in SensorThings as Actuators and TaskingCapabilities on the stream\'s Thing (SWE Common parameters)', async () => {
    const tc = await staRequest(B, [`TaskingCapabilities('${capId}')`], new URLSearchParams(), { signedIn: false });
    expect(tc).toMatchObject({ status: 200, body: { name: 'Change the sampling interval', taskingParameters: { type: 'DataRecord', field: [
      { name: 'intervalSeconds', type: 'Quantity', uom: { code: 's' }, constraint: { interval: [[10, 3600]] } },
      { name: 'mode', type: 'Category', optional: true, constraint: { value: ['normal', 'flood'] } },
    ] } } });
    expect((await staRequest(B, [`TaskingCapabilities('${capId}')`, 'Actuator'], new URLSearchParams(), { signedIn: false })).body).toMatchObject({ name: 'Tana gauge logger' });
    expect((await staRequest(B, [`TaskingCapabilities('${capId}')`, 'Thing'], new URLSearchParams(), { signedIn: false })).body).toMatchObject({ '@iot.id': 'stream:river.tana.garissa' });
    expect(((await staRequest(B, ["Things('stream:river.tana.garissa')", 'TaskingCapabilities'], new URLSearchParams(), { signedIn: false })).body as { value: unknown[] }).value).toHaveLength(1);
  });
});

describe('tasks', () => {
  it('are created only by a signed-in official allowed to task sensors, with checked parameters and a reason', async () => {
    const body = { capabilityId: capId, parameters: { intervalSeconds: 60, mode: 'flood' }, reason: 'Flood watch on the Tana', by: 'Typed Name' };
    expect((await tasks.POST(json('http://localhost/api/twin/tasking/tasks', body))).status).toBe(401);
    await signInAs('officer@gov.test', 'officer');
    expect((await tasks.POST(json('http://localhost/api/twin/tasking/tasks', body))).status).toBe(403);
    expect(canTaskSensor({ role: 'auditor' })).toMatch(/administrator or an official who can sign/);
    await signInAs('signer@gov.test', 'signatory');
    const bad = async (b: unknown) => (await (await tasks.POST(json('http://localhost/api/twin/tasking/tasks', b))).json()).error;
    expect(await bad({ ...body, parameters: { intervalSeconds: 5 } })).toMatch(/at least 10 s/);
    expect(await bad({ ...body, parameters: { intervalSeconds: 60, mode: 'storm' } })).toMatch(/one of normal, flood/);
    expect(await bad({ ...body, parameters: { intervalSeconds: 60, colour: 'red' } })).toMatch(/takes no parameter colour/);
    expect(await bad({ ...body, parameters: {} })).toMatch(/Give Sampling interval/);
    expect(await bad({ ...body, reason: '' })).toMatch(/reason/);
    const r = await tasks.POST(json('http://localhost/api/twin/tasking/tasks', body));
    expect(r.status).toBe(201);
    expect((await r.json()).task).toMatchObject({ createdBy: 'signer, Water Directorate', status: 'created', parameters: { intervalSeconds: 60, mode: 'flood' } });
    expect(listAudit().some(a => a.action === 'twin.tasking.task.create' && a.actor === 'signer, Water Directorate' && /Flood watch/.test(a.detail ?? ''))).toBe(true);
  });

  it('are created through SensorThings POST Tasks by an official, never with a key; listed to officials only', async () => {
    const body = { TaskingCapability: { '@iot.id': capId }, taskingParameters: { intervalSeconds: 120 }, reason: 'Routine check' };
    expect((await sta.POST(json(`${B}/Tasks`, body, 'POST', { authorization: gw.auth }), params({ path: ['Tasks'] }))).status).toBe(403);
    expect((await sta.POST(json(`${B}/Tasks`, body), params({ path: ['Tasks'] }))).status).toBe(401);
    await signInAs('admin2@gov.test', 'administrator');
    const r = await sta.POST(json(`${B}/Tasks`, body), params({ path: ['Tasks'] }));
    expect(r.status).toBe(201);
    expect(r.headers.get('Location')).toMatch(/Tasks\('TASK-\d+'\)$/);
    const via = await sta.POST(json(`${B}/x`, { taskingParameters: { intervalSeconds: 30 }, reason: 'Second check' }), params({ path: [`TaskingCapabilities('${capId}')`, 'Tasks'] }));
    expect(via.status).toBe(201);
    expect(((await staRequest(B, ['Tasks'], new URLSearchParams(), { signedIn: false })).body as { value: unknown[] }).value).toEqual([]);
    const seen = (await staRequest(B, [`TaskingCapabilities('${capId}')`, 'Tasks'], new URLSearchParams(), { signedIn: true })).body as { value: { taskingParameters: unknown; properties: { status: string } }[] };
    expect(seen.value.map(t => t.taskingParameters)).toEqual([{ intervalSeconds: 120 }, { intervalSeconds: 30 }]);
  });

  it('are pulled by the executing integration with its key, acknowledged forward only, and cancelled by an official', async () => {
    await signInAs('signer@gov.test', 'signatory');
    const t1 = (await (await tasks.POST(json('http://localhost/api/twin/tasking/tasks', { capabilityId: capId, parameters: { intervalSeconds: 60 }, reason: 'Flood watch' }))).json()).task;
    const t2 = (await (await tasks.POST(json('http://localhost/api/twin/tasking/tasks', { capabilityId: capId, parameters: { intervalSeconds: 600 }, reason: 'Back to normal later' }))).json()).task;
    cookie = undefined;
    const pullUrl = 'http://localhost/api/twin/tasking/executor';
    expect((await executor.GET(get(pullUrl))).status).toBe(401);
    expect((await executor.GET(get(pullUrl, { authorization: integration(['ogc:read']).auth }))).status).toBe(403);
    const other = integration([TASKING_SCOPE]);
    expect((await (await executor.GET(get(pullUrl, { authorization: other.auth }))).json()).tasks).toEqual([]);
    const pulled = (await (await executor.GET(get(pullUrl, { authorization: gw.auth }))).json()).tasks as { id: string; status: string; capability: { id: string } }[];
    expect(pulled.map(t => [t.id, t.status, t.capability.id])).toEqual([[t1.id, 'delivered', capId], [t2.id, 'delivered', capId]]);
    expect(listAudit().some(a => a.action === 'twin.tasking.task.deliver' && /2 tasks delivered/.test(a.detail ?? ''))).toBe(true);
    const ack = (id: string, b: unknown, auth = gw.auth) => report.POST(json(`${pullUrl}/${id}`, b, 'POST', { authorization: auth }), params({ id }));
    expect((await ack(t1.id, { status: 'accepted' }, other.auth)).status).toBe(404);
    expect((await ack(t1.id, { status: 'done' })).status).toBe(400);
    expect((await ack(t1.id, { status: 'completed' })).status).toBe(409);
    expect((await ack(t1.id, { status: 'accepted', note: 'Logger reconfigured' })).status).toBe(200);
    expect((await ack(t1.id, { status: 'completed' })).status).toBe(200);
    expect((await ack(t1.id, { status: 'failed' })).status).toBe(409);
    // An official cancels the other; the gateway sees it cancelled once.
    expect((await cancel.POST(json('http://localhost/x', { reason: 'Warning lifted' }), params({ id: t2.id }))).status).toBe(401);
    await signInAs('admin2@gov.test', 'administrator');
    expect((await cancel.POST(json('http://localhost/x', { reason: 'Warning lifted' }), params({ id: t2.id }))).status).toBe(200);
    expect((await cancel.POST(json('http://localhost/x', { reason: 'Again' }), params({ id: t1.id }))).status).toBe(422);
    cookie = undefined;
    expect(((await (await executor.GET(get(pullUrl, { authorization: gw.auth }))).json()).tasks as { id: string; status: string }[]).map(t => [t.id, t.status])).toEqual([[t2.id, 'cancelled']]);
    expect((await (await executor.GET(get(pullUrl, { authorization: gw.auth }))).json()).tasks).toEqual([]);
    expect(listTasks().find(t => t.id === t1.id)!.history.map(h => h.status)).toEqual(['created', 'delivered', 'accepted', 'completed']);
    expect(listAudit().filter(a => a.action === 'twin.tasking.task.status').map(a => a.detail).sort()).toEqual(['accepted · Logger reconfigured', 'completed']);
    // The rules: the executor's routes check their own key; tasks are officials' work.
    expect(mutationRule('/api/twin/tasking/executor/TASK-1')).toBe('bearer');
    expect(mutationRule('/api/twin/tasking/tasks')).toBe('official');
  });
});
