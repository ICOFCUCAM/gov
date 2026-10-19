// TileJSON 3.0.0 for the nation's boundary vector tiles: the tile address
// template (/api/twin/tiles/boundaries/{z}/{x}/{y}.mvt), zoom range, bounds,
// the boundary version in force for each level, the worldview disputed
// territory is drawn by, the credit and the layers' fields
// (lib/twin/boundary-tiles.ts).
import { NextRequest, NextResponse } from 'next/server';
import { boundaryTileJson } from '@/lib/twin/boundary-tiles';
import { machineReadRefusal } from '@/lib/twin/machine-read';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // A GIS client's integration key (scope ogc:read), when it sends one; otherwise the official's session.
  const refused = await machineReadRefusal(req);
  if (refused) return refused;
  return NextResponse.json(await boundaryTileJson(req.nextUrl.origin), { headers: { 'cache-control': 'private, max-age=60' } });
}
