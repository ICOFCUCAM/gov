// /api/releases/advisories/[id]/csaf — one advisory as a CSAF 2.0-style
// JSON document, including this nation's VEX product status.
import { NextRequest, NextResponse } from 'next/server';
import { nationFor } from '@/lib/updates/access';
import { csaf, getAdvisory } from '@/lib/data/advisories';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  const a = getAdvisory(params.id);
  if (!a) return NextResponse.json({ error: 'Advisory not found' }, { status: 404 });
  return new NextResponse(JSON.stringify(csaf(a, n), null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="${a.id.toLowerCase()}.csaf.json"` },
  });
}
