// One OGC API – Features collection of the national twin.
import { NextRequest, NextResponse } from 'next/server';
import { collectionInfo, COLLECTION } from '@/lib/twin/ogc';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { collectionId: string } }) {
  if (params.collectionId !== COLLECTION) return NextResponse.json({ error: 'No such collection' }, { status: 404 });
  return NextResponse.json(await collectionInfo(`${req.nextUrl.origin}/api/twin/ogc`));
}
