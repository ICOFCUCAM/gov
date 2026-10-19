// /api/releases/sla-report?month=YYYY-MM — this nation's monthly SLA
// report: availability, incidents and ticket SLA performance. `download=1`
// returns it as a JSON attachment.
import { NextRequest, NextResponse } from 'next/server';
import { nationFor } from '@/lib/updates/access';
import { reportMonths, slaReport } from '@/lib/data/status';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const u = new URL(req.url);
  const n = nationFor(u.searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  const months = reportMonths();
  const month = u.searchParams.get('month') ?? months[0]!;
  const r = slaReport(n.id, month);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  if (u.searchParams.get('download')) {
    return new NextResponse(JSON.stringify(r, null, 2), { headers: { 'content-type': 'application/json', 'content-disposition': `attachment; filename="sla-report-${month}.json"` } });
  }
  return NextResponse.json({ report: r, months });
}
