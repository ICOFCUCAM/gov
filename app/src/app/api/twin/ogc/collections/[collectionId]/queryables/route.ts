// OGC API – Features Part 3 queryables of one collection of the national twin:
// a JSON Schema of the properties a client may filter on, each accepted as a
// query parameter on /items (lib/twin/ogc-queryables.ts).
import { NextRequest, NextResponse } from 'next/server';
import { queryables } from '@/lib/twin/ogc-queryables';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest, { params }: { params: { collectionId: string } }) {
  const q = queryables(`${req.nextUrl.origin}/api/twin/ogc`, params.collectionId);
  if (!q) return NextResponse.json({ error: 'No such collection' }, { status: 404 });
  return NextResponse.json(q, { headers: { 'content-type': 'application/schema+json' } });
}
