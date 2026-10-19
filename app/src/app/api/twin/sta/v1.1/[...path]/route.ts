// OGC SensorThings API v1.1 resources of the national twin:
// /Things, /Locations, /Sensors, /ObservedProperties, /Datastreams,
// /Observations, one member by id (e.g. /Things('place:KE-30')) and its
// navigation properties (e.g. /Datastreams('…')/Observations), with $top,
// $skip, $count, $orderby and $filter. Twin entities, sources and
// observations, substrate telemetry streams when the substrate is reachable,
// and the streams that receive pushed readings; restricted sites' positions as
// the viewer may see them (lib/twin/sta.ts).
//
// POST creates Observations on a twin stream source's Datastream
// (/Observations, /Datastreams('telemetry:<stream id>')/Observations, and the
// Data Array /CreateObservations), only with the key of the integration bound
// to that source (Authorization: Bearer civ_…, scope sta:write; BEARER_ROUTES
// in lib/auth/roles.ts). They are checked, refused with reasons, audited and
// kept as readings the stream's daily run turns into observations
// (lib/twin/sta-write.ts, lib/twin/stream-ingest.ts).
//
// DELETE Observations('telemetry:<stream id>~<reading id>') with the same key
// withdraws a reading it sent (with ?reason=, a JSON { reason } or X-Reason):
// kept on record, no longer served or counted; a day already recorded has its
// run's withdrawal proposed to an official. PATCH and PUT answer 405 (update-
// entity is not offered: a correction is a new reading). See the service
// root's serverSettings for the conformance classes and what each covers.
//
// Tasking Core: POST Tasks (or TaskingCapabilities('<id>')/Tasks) creates a
// task for a declared capability, only for a signed-in official allowed to
// task sensors (canTaskSensor, lib/auth/roles.ts), with { taskingParameters,
// TaskingCapability: { "@iot.id" }, reason }; the executing integration pulls
// it from /api/twin/tasking/executor (lib/twin/tasking.ts).
import { readText, TOO_LARGE } from '@/lib/net/body-limit';
import { NextRequest, NextResponse } from 'next/server';
import { staRequest } from '@/lib/twin/sta';
import { staCreate, staDelete, STA_UPDATE_REFUSAL } from '@/lib/twin/sta-write';
import { syncRegister } from '@/lib/twin/register';
import { currentOfficial, actorLabel } from '@/lib/auth/official';
import { machineReadRefusal } from '@/lib/twin/machine-read';
import { canTaskSensor, secondStepMissing } from '@/lib/auth/roles';
import { createTask } from '@/lib/twin/tasking';

export const dynamic = 'force-dynamic';

const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
/** The largest request body taken (a CreateObservations batch of 5,000 readings fits). */
const MAX_BODY = 2_000_000;

export async function GET(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  const params = await props.params;
  // A GIS client's integration key (scope ogc:read), when it sends one; otherwise the official's session.
  const refused = await machineReadRefusal(req);
  if (refused) return refused;
  await syncRegister();
  const o = await currentOfficial();
  const r = await staRequest(`${req.nextUrl.origin}/api/twin/sta/v1.1`, params.path.map(decode), req.nextUrl.searchParams, o ? { institution: o.institution, signedIn: true } : { signedIn: false });
  return NextResponse.json(r.body, { status: r.status });
}

export async function POST(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  const params = await props.params;
  // Read with the byte cap, also when no length is declared (lib/net/body-limit.ts, review L-4).
  const text = await readText(req, MAX_BODY).catch(() => '');
  if (text === TOO_LARGE) return NextResponse.json({ code: 413, type: 'error', message: `The request is larger than ${MAX_BODY / 1_000_000} MB` }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(text); } catch { return NextResponse.json({ code: 400, type: 'error', message: 'Send JSON' }, { status: 400 }); }
  await syncRegister();
  const path = params.path.map(decode);
  const onCapability = path.length === 2 && path[1] === 'Tasks' ? /^TaskingCapabilities\('((?:[^']|'')*)'\)$/.exec(path[0]!) : null;
  if ((path.length === 1 && path[0] === 'Tasks') || onCapability) return createStaTask(req, body, onCapability ? onCapability[1]!.replace(/''/g, "'") : undefined);
  // The key of the integration bound to the stream source, checked in staCreate (verifyIntegrationKey, scope sta:write).
  const r = staCreate(`${req.nextUrl.origin}/api/twin/sta/v1.1`, params.path.map(decode), body, req.headers.get('authorization'));
  return NextResponse.json(r.body, { status: r.status, headers: r.headers });
}

/** A Task through SensorThings: a signed-in official only (never a key), allowed by canTaskSensor; audited in createTask. */
async function createStaTask(req: NextRequest, body: unknown, capabilityFromPath: string | undefined) {
  const fail = (status: number, message: string) => NextResponse.json({ code: status, type: 'error', message }, { status });
  if (req.headers.get('authorization')) return fail(403, 'Tasks are created by a signed-in official, not with an integration key or token');
  const o = await currentOfficial();
  if (!o) return fail(401, 'Sign in as an official to create a task');
  const why = secondStepMissing(o) ?? canTaskSensor(o);
  if (why) return fail(403, why);
  const b = (body && typeof body === 'object' && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
  const cap = capabilityFromPath ?? (b.TaskingCapability as { '@iot.id'?: unknown } | undefined)?.['@iot.id'];
  const reason = b.reason ?? (b.properties as { reason?: unknown } | undefined)?.reason;
  const t = createTask({ capabilityId: cap, parameters: b.taskingParameters, reason }, { name: actorLabel(o), institution: o.institution });
  if ('error' in t) return fail(400, t.error);
  const self = `${req.nextUrl.origin}/api/twin/sta/v1.1/Tasks('${t.id}')`;
  return NextResponse.json({ '@iot.id': t.id, '@iot.selfLink': self, creationTime: t.createdAt, taskingParameters: t.parameters, properties: { status: t.status, reason: t.reason, createdBy: t.createdBy }, 'TaskingCapability@iot.navigationLink': `${self}/TaskingCapability` }, { status: 201, headers: { Location: self } });
}

const refuseUpdate = () => NextResponse.json({ code: 405, type: 'error', message: STA_UPDATE_REFUSAL }, { status: 405, headers: { Allow: 'GET, POST, DELETE' } });
export const PATCH = refuseUpdate;
export const PUT = refuseUpdate;

export async function DELETE(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  const params = await props.params;
  const read = await readText(req, 16_000).catch(() => '');
  if (read === TOO_LARGE) return NextResponse.json({ code: 413, type: 'error', message: 'A deletion\'s body (its reason) is at most 16 kB' }, { status: 413 });
  const text = read;
  let reason = req.nextUrl.searchParams.get('reason') ?? req.headers.get('x-reason') ?? undefined;
  if (!reason && text) { try { const b = JSON.parse(text) as { reason?: unknown }; if (typeof b?.reason === 'string') reason = b.reason; } catch { /* no JSON body: no reason given */ } }
  await syncRegister();
  // The key of the integration bound to the reading's stream source, checked in staDelete (scope sta:write).
  const r = staDelete(params.path.map(decode), reason, req.headers.get('authorization'));
  return NextResponse.json(r.body, { status: r.status, headers: r.headers });
}
