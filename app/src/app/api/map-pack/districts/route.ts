// The districts installed for the nation (lib/data/map-pack.ts), for maps to
// draw (lib/map/districts-installed.ts). Open data with its credit, like the
// boundaries in force; who installed them is not included.
// ?iso3=XXX (another nation gets nothing); &shapes=0 for the summary only;
// &parent=<region code> for one region's districts (what a map opens).
import { NextRequest, NextResponse } from 'next/server';
import { installedForMaps } from '@/lib/data/map-pack';
import { nationIso3 } from '@/lib/nation/registry';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const iso3 = q.get('iso3') ?? nationIso3() ?? '';
  const parent = q.get('parent')?.slice(0, 80) || undefined;
  return NextResponse.json({ installed: installedForMaps(iso3, q.get('shapes') !== '0', parent) });
}
