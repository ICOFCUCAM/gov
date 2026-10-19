// OGC SensorThings API v1.1 service root of the national twin (read-only):
// the entity sets (Things, Locations, Sensors, ObservedProperties,
// Datastreams, Observations) and the conformance classes served
// (lib/twin/sta.ts).
import { NextRequest, NextResponse } from 'next/server';
import { serviceRoot } from '@/lib/twin/sta';
import { machineReadRefusal } from '@/lib/twin/machine-read';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // A GIS client's integration key (scope ogc:read), when it sends one; otherwise the official's session.
  const refused = await machineReadRefusal(req);
  if (refused) return refused;
  return NextResponse.json(serviceRoot(`${req.nextUrl.origin}/api/twin/sta/v1.1`));
}
