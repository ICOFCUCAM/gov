// One OGC API – Features collection of the national twin.
import { NextRequest, NextResponse } from 'next/server';
import { collectionInfo, COLLECTION } from '@/lib/twin/ogc';
import { facilitiesInfo, FACILITY_COLLECTION } from '@/lib/twin/ogc-facilities';
import { boundariesInfo, BOUNDARY_COLLECTION } from '@/lib/twin/ogc-boundaries';
import { machineReadRefusal } from '@/lib/twin/machine-read';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { collectionId: string } }) {
  // A GIS client's integration key (scope ogc:read), when it sends one; otherwise the official's session.
  const refused = machineReadRefusal(req);
  if (refused) return refused;
  const base = `${req.nextUrl.origin}/api/twin/ogc`;
  if (params.collectionId === FACILITY_COLLECTION) return NextResponse.json(facilitiesInfo(base));
  if (params.collectionId === BOUNDARY_COLLECTION) return NextResponse.json(boundariesInfo(base));
  if (params.collectionId !== COLLECTION) return NextResponse.json({ error: 'No such collection' }, { status: 404 });
  return NextResponse.json(await collectionInfo(base));
}
