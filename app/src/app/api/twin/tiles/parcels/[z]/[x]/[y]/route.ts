// One Mapbox Vector Tile (MVT 2.1) of the land parcel register: layer
// "parcels", published parcels as polygons with their public fields only
// (parcel id, land use, computed area, region and district, survey method and
// accuracy; never rights or holders), from zoom 13 (empty below it), simplified
// per zoom on a shared-edge topology (lib/twin/parcel-tiles.ts). The ETag
// changes with every published change; If-None-Match gives 304 until then.
// Zoom 0–20; y may end in .mvt or .pbf. Behind the official's session, or a
// GIS client's integration key or access token of scope ogc:read.
import { NextRequest, NextResponse } from 'next/server';
import { parcelTile, parseParcelTile, PARCEL_MAX_ZOOM } from '@/lib/twin/parcel-tiles';
import { MVT_TYPE } from '@/lib/twin/tiles';
import { machineReadRefusal } from '@/lib/twin/machine-read';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const params = await props.params;
  // A GIS client's integration key (scope ogc:read), when it sends one; otherwise the official's session.
  const refused = await machineReadRefusal(req);
  if (refused) return refused;
  const t = parseParcelTile(params.z, params.x, params.y);
  if (!t) return NextResponse.json({ error: `No such tile: z 0–${PARCEL_MAX_ZOOM}, x and y within 0 … 2^z − 1` }, { status: 404 });
  const r = parcelTile(t.z, t.x, t.y);
  const headers = { 'content-type': MVT_TYPE, 'cache-control': 'private, max-age=60, must-revalidate', etag: r.etag, 'x-feature-count': String(r.features), ...(r.truncated ? { 'x-truncated': 'true' } : {}) };
  if (req.headers.get('if-none-match') === r.etag) return new NextResponse(null, { status: 304, headers });
  return new NextResponse(r.bytes, { status: 200, headers });
}
