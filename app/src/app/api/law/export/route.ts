// GET /api/law/export?instrument=&version= — a confirmed version as an Akoma
// Ntoso document (lib/law/akoma-ntoso.ts).
import { NextRequest, NextResponse } from 'next/server';
import { getInstrument } from '@/lib/law/register';
import { toAkomaNtoso } from '@/lib/law/akoma-ntoso';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const inst = getInstrument(q.get('instrument') ?? '');
  const v = inst?.versions.find(x => x.id === q.get('version') && x.state === 'confirmed');
  if (!inst || !v) return NextResponse.json({ error: 'No such confirmed version' }, { status: 404 });
  return new NextResponse(toAkomaNtoso(inst, v), { headers: { 'content-type': 'application/akn+xml; charset=utf-8', 'content-disposition': `attachment; filename="${inst.id.split('/').slice(2).join('-')}-${v.dates.inForce}.xml"` } });
}
