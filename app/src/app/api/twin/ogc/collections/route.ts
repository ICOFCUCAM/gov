// OGC API – Features collections of the national twin: the official
// subdivisions, the national facility register and the published boundaries,
// each with the coordinate systems it serves (Part 2: `crs`, `storageCrs`), and
// the systems offered across them (`crs`).
import { NextRequest, NextResponse } from 'next/server';
import { collectionInfo } from '@/lib/twin/ogc';
import { facilitiesInfo } from '@/lib/twin/ogc-facilities';
import { boundariesInfo } from '@/lib/twin/ogc-boundaries';
import { syncRegister } from '@/lib/twin/register';
import { machineReadRefusal } from '@/lib/twin/machine-read';
import { withCrs, collectionCrs } from '@/lib/twin/ogc-crs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // A GIS client's integration key (scope ogc:read), when it sends one; otherwise the official's session.
  const refused = await machineReadRefusal(req);
  if (refused) return refused;
  await syncRegister();
  const base = `${req.nextUrl.origin}/api/twin/ogc`;
  return NextResponse.json({ collections: [withCrs(await collectionInfo(base)), withCrs(facilitiesInfo(base)), withCrs(boundariesInfo(base))], crs: collectionCrs(), links: [{ href: `${base}/collections`, rel: 'self', type: 'application/json' }] });
}
