// The boundaries in force for the installed nation (both levels, with
// shapes), for maps to draw. Published boundaries are public information.
// ?at=YYYY-MM-DD for another date; &knownBy= for only what had been published by then.
import { NextRequest, NextResponse } from 'next/server';
import { boundariesInForce } from '@/lib/data/boundaries';
import { nationIso3 } from '@/lib/nation/registry';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const iso3 = q.get('iso3');
  if (iso3 && iso3 !== nationIso3()) return NextResponse.json({ active: [] });
  const date = (k: string) => { const v = q.get(k); const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d : undefined; };
  return NextResponse.json({ active: boundariesInForce(date('at'), date('knownBy')) });
}
