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
import { NextRequest, NextResponse } from 'next/server';
import { staRequest } from '@/lib/twin/sta';
import { staCreate } from '@/lib/twin/sta-write';
import { syncRegister } from '@/lib/twin/register';
import { currentOfficial } from '@/lib/auth/official';
import { machineReadRefusal } from '@/lib/twin/machine-read';

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
  const text = await req.text().catch(() => '');
  if (text.length > MAX_BODY) return NextResponse.json({ code: 413, type: 'error', message: `The request is larger than ${MAX_BODY / 1_000_000} MB` }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(text); } catch { return NextResponse.json({ code: 400, type: 'error', message: 'Send JSON' }, { status: 400 }); }
  await syncRegister();
  // The key of the integration bound to the stream source, checked in staCreate (verifyIntegrationKey, scope sta:write).
  const r = staCreate(`${req.nextUrl.origin}/api/twin/sta/v1.1`, params.path.map(decode), body, req.headers.get('authorization'));
  return NextResponse.json(r.body, { status: r.status, headers: r.headers });
}

export function PATCH() {
  return NextResponse.json({ code: 405, type: 'error', message: 'Readings are never changed: a run that recorded wrong values is withdrawn by an official' }, { status: 405 });
}

export function DELETE() {
  return NextResponse.json({ code: 405, type: 'error', message: 'Readings are never deleted: a run that recorded wrong values is withdrawn by an official' }, { status: 405 });
}
