// The national twin's data catalogue as DCAT-AP JSON-LD (lib/twin/catalog.ts):
// a dcat:Catalog with a dataset for each registered source, each published
// boundary version and each OGC API – Features collection, with publisher,
// licence, temporal and spatial coverage and distributions. Read only. Not a
// public read: it describes the twin's sources, which are behind the platform
// session like the twin and its OGC endpoints.

import { NextRequest, NextResponse } from 'next/server';
import { twinCatalog } from '@/lib/twin/catalog';
import { syncRegister } from '@/lib/twin/register';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await syncRegister();
  return NextResponse.json(await twinCatalog(req.nextUrl.origin), { headers: { 'content-type': 'application/ld+json; charset=utf-8' } });
}
