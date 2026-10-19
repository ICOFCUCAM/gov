// OGC SensorThings API v1.1 service root of the national twin (read-only):
// the entity sets (Things, Locations, Sensors, ObservedProperties,
// Datastreams, Observations) and the conformance classes served
// (lib/twin/sta.ts).
import { NextRequest, NextResponse } from 'next/server';
import { serviceRoot } from '@/lib/twin/sta';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  return NextResponse.json(serviceRoot(`${req.nextUrl.origin}/api/twin/sta/v1.1`));
}
