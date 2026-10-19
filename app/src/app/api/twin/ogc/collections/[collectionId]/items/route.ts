// OGC API – Features items: the nation's subdivisions as GeoJSON with their
// observed values (?limit, ?offset, ?bbox=minLon,minLat,maxLon,maxLat, ?datetime, ?level=1|2),
// or the national facility register's published sites (also ?category), as
// the viewer may see them, or the published boundaries in force (also ?level).
import { NextRequest, NextResponse } from 'next/server';
import { items, COLLECTION } from '@/lib/twin/ogc';
import { facilityItems, FACILITY_COLLECTION } from '@/lib/twin/ogc-facilities';
import { boundaryItems, BOUNDARY_COLLECTION } from '@/lib/twin/ogc-boundaries';
import { syncRegister } from '@/lib/twin/register';
import { currentOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { collectionId: string } }) {
  const sp = req.nextUrl.searchParams;
  const base = `${req.nextUrl.origin}/api/twin/ogc`;
  if (params.collectionId === FACILITY_COLLECTION) {
    const o = await currentOfficial();
    const r = facilityItems(base, { limit: sp.get('limit'), offset: sp.get('offset'), bbox: sp.get('bbox'), datetime: sp.get('datetime'), category: sp.get('category') }, o ? { institution: o.institution, signedIn: true } : { signedIn: false });
    if ('error' in r) return NextResponse.json(r, { status: 400 });
    return NextResponse.json(r, { headers: { 'content-type': 'application/geo+json' } });
  }
  if (params.collectionId === BOUNDARY_COLLECTION) {
    const r = boundaryItems(base, { limit: sp.get('limit'), offset: sp.get('offset'), bbox: sp.get('bbox'), datetime: sp.get('datetime'), level: sp.get('level') });
    if ('error' in r) return NextResponse.json(r, { status: 400 });
    return NextResponse.json(r, { headers: { 'content-type': 'application/geo+json' } });
  }
  if (params.collectionId !== COLLECTION) return NextResponse.json({ error: 'No such collection' }, { status: 404 });
  await syncRegister();
  const r = await items(base, { limit: sp.get('limit'), offset: sp.get('offset'), bbox: sp.get('bbox'), datetime: sp.get('datetime'), level: sp.get('level') });
  if ('error' in r) return NextResponse.json(r, { status: 400 });
  return NextResponse.json(r, { headers: { 'content-type': 'application/geo+json' } });
}
