// One subdivision as a GeoJSON feature with its observed values (?datetime).
import { NextRequest, NextResponse } from 'next/server';
import { item, COLLECTION } from '@/lib/twin/ogc';
import { syncRegister } from '@/lib/twin/register';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { collectionId: string; featureId: string } }) {
  if (params.collectionId !== COLLECTION) return NextResponse.json({ error: 'No such collection' }, { status: 404 });
  await syncRegister();
  const r = await item(`${req.nextUrl.origin}/api/twin/ogc`, params.featureId, req.nextUrl.searchParams.get('datetime'));
  if (!r) return NextResponse.json({ error: 'No such feature' }, { status: 404 });
  if ('error' in r) return NextResponse.json(r, { status: 400 });
  return NextResponse.json(r, { headers: { 'content-type': 'application/geo+json' } });
}
