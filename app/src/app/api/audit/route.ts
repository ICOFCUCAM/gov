// The platform audit chain, newest first, one page at a time (go-live review
// M-8): ?limit= (default 200, at most 1000) and ?before=<seq> for the page
// after; `total` is the chain's length and `nextBefore` the cursor for the
// next page (absent on the last one).
import { NextRequest, NextResponse } from 'next/server';
import { listAuditPage } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const num = (k: string) => { const v = q.get(k); return v === null || v === '' ? undefined : Number(v); };
  return NextResponse.json(listAuditPage({ before: num('before'), limit: num('limit') }));
}
