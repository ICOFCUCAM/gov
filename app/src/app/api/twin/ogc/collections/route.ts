// OGC API – Features collections of the national twin: the official
// subdivisions, the national facility register and the published boundaries.
import { NextRequest, NextResponse } from 'next/server';
import { collectionInfo } from '@/lib/twin/ogc';
import { facilitiesInfo } from '@/lib/twin/ogc-facilities';
import { boundariesInfo } from '@/lib/twin/ogc-boundaries';
import { syncRegister } from '@/lib/twin/register';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await syncRegister();
  const base = `${req.nextUrl.origin}/api/twin/ogc`;
  return NextResponse.json({ collections: [await collectionInfo(base), facilitiesInfo(base), boundariesInfo(base)], links: [{ href: `${base}/collections`, rel: 'self', type: 'application/json' }] });
}
