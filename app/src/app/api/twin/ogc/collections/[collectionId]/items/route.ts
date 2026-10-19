// OGC API – Features items: the nation's subdivisions as GeoJSON with their
// observed values (?limit, ?offset, ?bbox=minLon,minLat,maxLon,maxLat, ?datetime, ?level=1|2),
// or the national facility register's published sites (also ?category), as
// the viewer may see them, or the published boundaries in force (also ?level),
// or the land parcel register's published parcels (public fields only).
// Each collection's queryables (/collections/{id}/queryables) are accepted as
// equality filters (e.g. ?regionCode=KE-30&status=operational); any other
// parameter is refused with 400. CQL2 filters (OGC API – Features Part 3):
// ?filter=<CQL2-Text or CQL2-JSON>&filter-lang=cql2-text|cql2-json&filter-crs=CRS84
// on the queryables and geometry (lib/twin/cql2.ts); an invalid filter is 400 with the reason.
// Coordinate systems (Part 2, lib/twin/ogc-crs.ts): ?crs=<URI> serves the
// features in EPSG:4326, EPSG:3857 or one of the nation's national grids
// (each collection lists them in `crs`), ?bbox-crs=<URI> reads bbox in one of
// them; the answer's Content-Crs header names the system of its coordinates.
import { NextRequest, NextResponse } from 'next/server';
import { items, COLLECTION } from '@/lib/twin/ogc';
import { facilityItems, FACILITY_COLLECTION } from '@/lib/twin/ogc-facilities';
import { boundaryItems, BOUNDARY_COLLECTION } from '@/lib/twin/ogc-boundaries';
import { parcelItems, PARCEL_COLLECTION } from '@/lib/twin/ogc-parcels';
import { readFilters } from '@/lib/twin/ogc-queryables';
import { readCql2 } from '@/lib/twin/cql2';
import { syncRegister } from '@/lib/twin/register';
import { currentOfficial } from '@/lib/auth/official';
import { machineReadRefusal } from '@/lib/twin/machine-read';
import { readCrsParam, bboxToCrs84, answerInCrs, contentCrs } from '@/lib/twin/ogc-crs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ collectionId: string }> }) {
  const params = await props.params;
  // A GIS client's integration key (scope ogc:read), when it sends one; otherwise the official's session.
  const refused = await machineReadRefusal(req);
  if (refused) return refused;
  const sp = req.nextUrl.searchParams;
  const base = `${req.nextUrl.origin}/api/twin/ogc`;
  if (![FACILITY_COLLECTION, BOUNDARY_COLLECTION, PARCEL_COLLECTION, COLLECTION].includes(params.collectionId)) return NextResponse.json({ error: 'No such collection' }, { status: 404 });
  const filters = readFilters(params.collectionId, sp);
  if ('error' in filters) return NextResponse.json({ code: 'InvalidParameterValue', description: filters.error, error: filters.error }, { status: 400 });
  const cql = readCql2(params.collectionId, sp.get('filter'), sp.get('filter-lang'), sp.get('filter-crs'));
  if (cql && 'error' in cql) return NextResponse.json({ code: 'InvalidParameterValue', description: cql.error, error: cql.error }, { status: 400 });
  const crsQ = { crs: sp.get('crs'), bbox: sp.get('bbox'), bboxCrs: sp.get('bbox-crs') };
  const crs = readCrsParam(crsQ.crs, 'crs');
  const bboxCrs = readCrsParam(crsQ.bboxCrs, 'bbox-crs');
  for (const c of [crs, bboxCrs]) if (c && 'error' in c) return NextResponse.json({ code: 'InvalidParameterValue', description: c.error, error: c.error }, { status: 400 });
  const out = crs && !('error' in crs) ? crs : undefined;
  const bbox = bboxToCrs84(crsQ.bbox, bboxCrs && !('error' in bboxCrs) ? bboxCrs : undefined);
  if (bbox && typeof bbox === 'object') return NextResponse.json({ code: 'InvalidParameterValue', description: bbox.error, error: bbox.error }, { status: 400 });
  const paging = { limit: sp.get('limit'), offset: sp.get('offset'), bbox, datetime: sp.get('datetime'), filters, cql };
  const headers = { 'content-type': 'application/geo+json', 'content-crs': contentCrs(out) };
  if (params.collectionId === FACILITY_COLLECTION) {
    const o = await currentOfficial();
    const r = facilityItems(base, paging, o ? { institution: o.institution, signedIn: true } : { signedIn: false });
    if ('error' in r) return NextResponse.json(r, { status: 400 });
    return NextResponse.json(answerInCrs(r, out, crsQ), { headers });
  }
  if (params.collectionId === BOUNDARY_COLLECTION) {
    const r = boundaryItems(base, paging);
    if ('error' in r) return NextResponse.json(r, { status: 400 });
    return NextResponse.json(answerInCrs(r, out, crsQ), { headers });
  }
  if (params.collectionId === PARCEL_COLLECTION) {
    // Public fields only (publicParcel()): never rights or holders.
    const r = parcelItems(base, paging);
    if ('error' in r) return NextResponse.json(r, { status: 400 });
    return NextResponse.json(answerInCrs(r, out, crsQ), { headers });
  }
  await syncRegister();
  const r = await items(base, paging);
  if ('error' in r) return NextResponse.json(r, { status: 400 });
  return NextResponse.json(answerInCrs(r, out, crsQ), { headers });
}
