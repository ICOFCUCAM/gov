// TileJSON 3.0.0 for the land parcel vector tiles: the tile address template
// (/api/twin/tiles/parcels/{z}/{x}/{y}.mvt), zoom range (from 13), bounds of
// the published parcels, the register's generation and the layer's fields
// (public only; lib/twin/parcel-tiles.ts).
import { NextRequest, NextResponse } from 'next/server';
import { parcelTileJson } from '@/lib/twin/parcel-tiles';
import { machineReadRefusal } from '@/lib/twin/machine-read';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // A GIS client's integration key (scope ogc:read), when it sends one; otherwise the official's session.
  const refused = await machineReadRefusal(req);
  if (refused) return refused;
  return NextResponse.json(parcelTileJson(req.nextUrl.origin), { headers: { 'cache-control': 'private, max-age=60' } });
}
