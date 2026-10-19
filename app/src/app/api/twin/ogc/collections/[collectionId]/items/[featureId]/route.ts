// One subdivision as a GeoJSON feature with its observed values (?datetime),
// or one published site of the national facility register, or one unit of
// the published boundaries in force. ?crs=<URI> serves it in another of the
// collection's coordinate systems (Part 2); Content-Crs names the one used.
import { NextRequest, NextResponse } from 'next/server';
import { item, COLLECTION } from '@/lib/twin/ogc';
import { facilityItem, FACILITY_COLLECTION } from '@/lib/twin/ogc-facilities';
import { boundaryItem, BOUNDARY_COLLECTION } from '@/lib/twin/ogc-boundaries';
import { syncRegister } from '@/lib/twin/register';
import { currentOfficial } from '@/lib/auth/official';
import { machineReadRefusal } from '@/lib/twin/machine-read';
import { readCrsParam, answerInCrs, contentCrs } from '@/lib/twin/ogc-crs';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ collectionId: string; featureId: string }> }
) {
  const params = await props.params;
  // A GIS client's integration key (scope ogc:read), when it sends one; otherwise the official's session.
  const refused = await machineReadRefusal(req);
  if (refused) return refused;
  const base = `${req.nextUrl.origin}/api/twin/ogc`;
  const crsQ = { crs: req.nextUrl.searchParams.get('crs'), bbox: null, bboxCrs: null };
  const crs = readCrsParam(crsQ.crs, 'crs');
  if (crs && 'error' in crs) return NextResponse.json({ code: 'InvalidParameterValue', description: crs.error, error: crs.error }, { status: 400 });
  const headers = { 'content-type': 'application/geo+json', 'content-crs': contentCrs(crs) };
  if (params.collectionId === FACILITY_COLLECTION) {
    const o = await currentOfficial();
    const r = facilityItem(base, params.featureId, o ? { institution: o.institution, signedIn: true } : { signedIn: false });
    if (!r) return NextResponse.json({ error: 'No such feature' }, { status: 404 });
    return NextResponse.json(answerInCrs(r, crs, crsQ), { headers });
  }
  if (params.collectionId === BOUNDARY_COLLECTION) {
    const r = boundaryItem(base, params.featureId);
    if (!r) return NextResponse.json({ error: 'No such feature' }, { status: 404 });
    return NextResponse.json(answerInCrs(r, crs, crsQ), { headers });
  }
  if (params.collectionId !== COLLECTION) return NextResponse.json({ error: 'No such collection' }, { status: 404 });
  await syncRegister();
  const r = await item(base, params.featureId, req.nextUrl.searchParams.get('datetime'));
  if (!r) return NextResponse.json({ error: 'No such feature' }, { status: 404 });
  if ('error' in r) return NextResponse.json(r, { status: 400 });
  return NextResponse.json(answerInCrs(r, crs, crsQ), { headers });
}
