// One subdivision as a GeoJSON feature with its observed values (?datetime),
// or one published site of the national facility register.
import { NextRequest, NextResponse } from 'next/server';
import { item, COLLECTION } from '@/lib/twin/ogc';
import { facilityItem, FACILITY_COLLECTION } from '@/lib/twin/ogc-facilities';
import { syncRegister } from '@/lib/twin/register';
import { currentOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { collectionId: string; featureId: string } }) {
  const base = `${req.nextUrl.origin}/api/twin/ogc`;
  if (params.collectionId === FACILITY_COLLECTION) {
    const o = await currentOfficial();
    const r = facilityItem(base, params.featureId, o ? { institution: o.institution, signedIn: true } : { signedIn: false });
    if (!r) return NextResponse.json({ error: 'No such feature' }, { status: 404 });
    return NextResponse.json(r, { headers: { 'content-type': 'application/geo+json' } });
  }
  if (params.collectionId !== COLLECTION) return NextResponse.json({ error: 'No such collection' }, { status: 404 });
  await syncRegister();
  const r = await item(base, params.featureId, req.nextUrl.searchParams.get('datetime'));
  if (!r) return NextResponse.json({ error: 'No such feature' }, { status: 404 });
  if ('error' in r) return NextResponse.json(r, { status: 400 });
  return NextResponse.json(r, { headers: { 'content-type': 'application/geo+json' } });
}
