// OGC SensorThings API v1.1 resources of the national twin (read-only):
// /Things, /Locations, /Sensors, /ObservedProperties, /Datastreams,
// /Observations, one member by id (e.g. /Things('place:KE-30')) and its
// navigation properties (e.g. /Datastreams('…')/Observations), with $top,
// $skip, $count, $orderby and $filter. Twin entities, sources and
// observations, and substrate telemetry streams when the substrate is
// reachable; restricted sites' positions as the viewer may see them
// (lib/twin/sta.ts).
import { NextRequest, NextResponse } from 'next/server';
import { staRequest } from '@/lib/twin/sta';
import { syncRegister } from '@/lib/twin/register';
import { currentOfficial } from '@/lib/auth/official';
import { machineReadRefusal } from '@/lib/twin/machine-read';

export const dynamic = 'force-dynamic';

const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

export async function GET(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  const params = await props.params;
  // A GIS client's integration key (scope ogc:read), when it sends one; otherwise the official's session.
  const refused = machineReadRefusal(req);
  if (refused) return refused;
  await syncRegister();
  const o = await currentOfficial();
  const r = await staRequest(`${req.nextUrl.origin}/api/twin/sta/v1.1`, params.path.map(decode), req.nextUrl.searchParams, o ? { institution: o.institution, signedIn: true } : { signedIn: false });
  return NextResponse.json(r.body, { status: r.status });
}
