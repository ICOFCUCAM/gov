// One OGC API – Features collection of the national twin, with the coordinate
// systems it serves (`crs`, `storageCrs`: OGC API – Features Part 2).
import { NextRequest, NextResponse } from 'next/server';
import { collectionInfo, COLLECTION } from '@/lib/twin/ogc';
import { facilitiesInfo, FACILITY_COLLECTION } from '@/lib/twin/ogc-facilities';
import { boundariesInfo, BOUNDARY_COLLECTION } from '@/lib/twin/ogc-boundaries';
import { parcelsInfo, PARCEL_COLLECTION } from '@/lib/twin/ogc-parcels';
import { machineReadRefusal } from '@/lib/twin/machine-read';
import { withCrs } from '@/lib/twin/ogc-crs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ collectionId: string }> }) {
  const params = await props.params;
  // A GIS client's integration key (scope ogc:read), when it sends one; otherwise the official's session.
  const refused = await machineReadRefusal(req);
  if (refused) return refused;
  const base = `${req.nextUrl.origin}/api/twin/ogc`;
  if (params.collectionId === FACILITY_COLLECTION) return NextResponse.json(withCrs(facilitiesInfo(base)));
  if (params.collectionId === BOUNDARY_COLLECTION) return NextResponse.json(withCrs(boundariesInfo(base)));
  if (params.collectionId === PARCEL_COLLECTION) return NextResponse.json(withCrs(parcelsInfo(base)));
  if (params.collectionId !== COLLECTION) return NextResponse.json({ error: 'No such collection' }, { status: 404 });
  return NextResponse.json(withCrs(await collectionInfo(base)));
}
