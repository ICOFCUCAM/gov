// OGC API – Features items: the nation's subdivisions as GeoJSON with their
// observed values (?limit, ?offset, ?bbox=minLon,minLat,maxLon,maxLat, ?datetime).
import { NextRequest, NextResponse } from 'next/server';
import { items, COLLECTION } from '@/lib/twin/ogc';
import { syncRegister } from '@/lib/twin/register';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { collectionId: string } }) {
  if (params.collectionId !== COLLECTION) return NextResponse.json({ error: 'No such collection' }, { status: 404 });
  await syncRegister();
  const sp = req.nextUrl.searchParams;
  const r = await items(`${req.nextUrl.origin}/api/twin/ogc`, { limit: sp.get('limit'), offset: sp.get('offset'), bbox: sp.get('bbox'), datetime: sp.get('datetime') });
  if ('error' in r) return NextResponse.json(r, { status: 400 });
  return NextResponse.json(r, { headers: { 'content-type': 'application/geo+json' } });
}
