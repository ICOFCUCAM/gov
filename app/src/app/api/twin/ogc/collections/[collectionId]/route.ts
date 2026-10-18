// One OGC API – Features collection of the national twin.
import { NextRequest, NextResponse } from 'next/server';
import { collectionInfo, COLLECTION } from '@/lib/twin/ogc';
import { facilitiesInfo, FACILITY_COLLECTION } from '@/lib/twin/ogc-facilities';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { collectionId: string } }) {
  const base = `${req.nextUrl.origin}/api/twin/ogc`;
  if (params.collectionId === FACILITY_COLLECTION) return NextResponse.json(facilitiesInfo(base));
  if (params.collectionId !== COLLECTION) return NextResponse.json({ error: 'No such collection' }, { status: 404 });
  return NextResponse.json(await collectionInfo(base));
}
