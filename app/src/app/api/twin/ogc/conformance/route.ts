// OGC API – Features conformance classes the twin's endpoint implements.
import { NextRequest, NextResponse } from 'next/server';
import { CONFORMANCE } from '@/lib/twin/ogc';
import { machineReadRefusal } from '@/lib/twin/machine-read';

export async function GET(req: NextRequest) {
  // A GIS client's integration key (scope ogc:read), when it sends one; otherwise the official's session.
  const refused = await machineReadRefusal(req);
  if (refused) return refused;
  return NextResponse.json({ conformsTo: CONFORMANCE });
}
