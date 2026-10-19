// TileJSON 3.0.0 for the national facility register's vector tiles: the
// tile address template (/api/twin/tiles/facilities/{z}/{x}/{y}.mvt), zoom
// range, bounds of the sites the viewer may see and the layer's fields
// (lib/twin/tiles.ts).
import { NextRequest, NextResponse } from 'next/server';
import { facilitiesTileJson } from '@/lib/twin/tiles';
import { currentOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const o = await currentOfficial();
  return NextResponse.json(facilitiesTileJson(req.nextUrl.origin, o ? { institution: o.institution, signedIn: true } : { signedIn: false }), { headers: { 'cache-control': 'private, max-age=60' } });
}
