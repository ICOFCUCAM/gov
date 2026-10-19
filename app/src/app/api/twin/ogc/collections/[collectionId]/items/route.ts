// OGC API – Features items: the nation's subdivisions as GeoJSON with their
// observed values (?limit, ?offset, ?bbox=minLon,minLat,maxLon,maxLat, ?datetime, ?level=1|2),
// or the national facility register's published sites (also ?category), as
// the viewer may see them, or the published boundaries in force (also ?level).
// Each collection's queryables (/collections/{id}/queryables) are accepted as
// equality filters (e.g. ?regionCode=KE-30&status=operational); any other
// parameter is refused with 400.
import { NextRequest, NextResponse } from 'next/server';
import { items, COLLECTION } from '@/lib/twin/ogc';
import { facilityItems, FACILITY_COLLECTION } from '@/lib/twin/ogc-facilities';
import { boundaryItems, BOUNDARY_COLLECTION } from '@/lib/twin/ogc-boundaries';
import { readFilters } from '@/lib/twin/ogc-queryables';
import { syncRegister } from '@/lib/twin/register';
import { currentOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { collectionId: string } }) {
  const sp = req.nextUrl.searchParams;
  const base = `${req.nextUrl.origin}/api/twin/ogc`;
  if (![FACILITY_COLLECTION, BOUNDARY_COLLECTION, COLLECTION].includes(params.collectionId)) return NextResponse.json({ error: 'No such collection' }, { status: 404 });
  const filters = readFilters(params.collectionId, sp);
  if ('error' in filters) return NextResponse.json({ code: 'InvalidParameterValue', description: filters.error, error: filters.error }, { status: 400 });
  const paging = { limit: sp.get('limit'), offset: sp.get('offset'), bbox: sp.get('bbox'), datetime: sp.get('datetime'), filters };
  if (params.collectionId === FACILITY_COLLECTION) {
    const o = await currentOfficial();
    const r = facilityItems(base, paging, o ? { institution: o.institution, signedIn: true } : { signedIn: false });
    if ('error' in r) return NextResponse.json(r, { status: 400 });
    return NextResponse.json(r, { headers: { 'content-type': 'application/geo+json' } });
  }
  if (params.collectionId === BOUNDARY_COLLECTION) {
    const r = boundaryItems(base, paging);
    if ('error' in r) return NextResponse.json(r, { status: 400 });
    return NextResponse.json(r, { headers: { 'content-type': 'application/geo+json' } });
  }
  await syncRegister();
  const r = await items(base, paging);
  if ('error' in r) return NextResponse.json(r, { status: 400 });
  return NextResponse.json(r, { headers: { 'content-type': 'application/geo+json' } });
}
