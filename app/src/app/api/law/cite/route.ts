// GET /api/law/cite?instrument=&eId=&on=YYYY-MM-DD — the provision as it
// stood on that date and the citation a decision keeps (exact version and
// digest; lib/law/register.ts). Never the current version by default.
import { NextRequest, NextResponse } from 'next/server';
import { cite, provisionOn } from '@/lib/law/register';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const instrument = q.get('instrument') ?? '', eId = q.get('eId') ?? '', on = q.get('on') ?? new Date().toISOString().slice(0, 10);
  const c = cite(instrument, eId, on);
  if ('error' in c) return NextResponse.json(c, { status: 404 });
  const p = provisionOn(instrument, eId, on);
  return NextResponse.json({ citation: c, provision: 'error' in p ? null : p.provision });
}
