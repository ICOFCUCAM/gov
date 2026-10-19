// OGC API – Features landing page for the national twin (lib/twin/ogc.ts).
import { NextRequest, NextResponse } from 'next/server';
import { landing } from '@/lib/twin/ogc';
import { getSovereign } from '@/lib/data/store';
import { machineReadRefusal } from '@/lib/twin/machine-read';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  // A GIS client's integration key (scope ogc:read), when it sends one; otherwise the official's session.
  const refused = machineReadRefusal(req);
  if (refused) return refused;
  return NextResponse.json(landing(`${req.nextUrl.origin}/api/twin/ogc`, getSovereign().stateName));
}
