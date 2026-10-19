// One Mapbox Vector Tile (MVT 2.1) of the nation's boundaries: polygon layers
// "regions" (official subdivisions), "districts" (from zoom 5) and "disputed"
// (disputed territory near the nation, marked disputed unless the nation chose
// a point of view in setup; never assigned to a side by the platform). Shapes
// are the boundary versions in force, read as every map reads them
// (loadNationGeography() / loadDistricts(), lib/twin/boundary-tiles.ts). The
// ETag changes when another boundary version comes into force, so a client
// revalidating with If-None-Match gets 304 until then. Zoom 0–14; y may end
// in .mvt or .pbf. Behind the official's session, or a GIS client's
// integration key or access token of scope ogc:read.
import { NextRequest, NextResponse } from 'next/server';
import { boundaryTile, parseBoundaryTile } from '@/lib/twin/boundary-tiles';
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
  const t = parseBoundaryTile(params.z, params.x, params.y);
  if (!t) return NextResponse.json({ error: 'No such tile: z 0–14, x and y within 0 … 2^z − 1' }, { status: 404 });
  const r = await boundaryTile(t.z, t.x, t.y);
  const headers = { 'content-type': MVT_TYPE, 'cache-control': 'private, max-age=60, must-revalidate', etag: r.etag, 'x-feature-count': String(r.features) };
  if (req.headers.get('if-none-match') === r.etag) return new NextResponse(null, { status: 304, headers });
  return new NextResponse(r.bytes, { status: 200, headers });
}
