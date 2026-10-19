// Provenance of one twin import as W3C PROV-O JSON-LD (lib/twin/prov.ts): the
// import as a prov:Activity associated with the official who ran it, the file
// it used (with its SHA-256) and the observations it generated; a withdrawal
// as the activity that invalidated them. Read only.

import { NextRequest, NextResponse } from 'next/server';
import { runProv } from '@/lib/twin/prov';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const doc = runProv(params.id, req.nextUrl.origin);
  if (!doc) return NextResponse.json({ error: 'No such import' }, { status: 404 });
  return NextResponse.json(doc, { headers: { 'content-type': 'application/ld+json; charset=utf-8' } });
}
