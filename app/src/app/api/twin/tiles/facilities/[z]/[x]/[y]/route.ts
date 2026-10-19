// One Mapbox Vector Tile (MVT 2.1) of the national facility register: layer
// "facilities", published sites as points with their id, national id, name,
// category, status, region and certification. Restricted sites are placed
// where the viewer may see them (generalised for viewers without need), so a
// tile is private to its viewer. y may end in .mvt or .pbf (lib/twin/tiles.ts).
import { NextRequest, NextResponse } from 'next/server';
import { facilitiesTile, parseTile, MVT_TYPE } from '@/lib/twin/tiles';
import { currentOfficial } from '@/lib/auth/official';
import { machineReadRefusal } from '@/lib/twin/machine-read';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const params = await props.params;
  // A GIS client's integration key (scope ogc:read), when it sends one; otherwise the official's session.
  const refused = machineReadRefusal(req);
  if (refused) return refused;
  const t = parseTile(params.z, params.x, params.y);
  if (!t) return NextResponse.json({ error: 'No such tile: z 0–18, x and y within 0 … 2^z − 1' }, { status: 404 });
  const o = await currentOfficial();
  const r = facilitiesTile(t.z, t.x, t.y, o ? { institution: o.institution, signedIn: true } : { signedIn: false });
  return new NextResponse(r.bytes, {
    status: 200,
    headers: { 'content-type': MVT_TYPE, 'cache-control': 'private, max-age=60', 'x-feature-count': String(r.count), ...(r.truncated ? { 'x-truncated': 'true' } : {}) },
  });
}
