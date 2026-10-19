// Provenance of one scenario version as W3C PROV-O JSON-LD (lib/twin/prov.ts):
// the version derived from the observations it started from (each with the
// import that generated it), the official who made it, the previous version
// it revises and its evidence hash. Read only.

import { NextRequest, NextResponse } from 'next/server';
import { scenarioProv } from '@/lib/twin/prov';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string; v: string }> }) {
  const params = await props.params;
  const doc = scenarioProv(params.id, Number(params.v), req.nextUrl.origin);
  if (!doc) return NextResponse.json({ error: 'No such scenario version' }, { status: 404 });
  return NextResponse.json(doc, { headers: { 'content-type': 'application/ld+json; charset=utf-8' } });
}
