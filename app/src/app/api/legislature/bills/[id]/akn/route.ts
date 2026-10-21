// GET /api/legislature/bills/{id}/akn?version=n — a version of a bill's text
// as an Akoma Ntoso bill document, with its life so far as lifecycle events
// (lib/law/akoma-ntoso.ts; plan phase 7). For the public only when the
// chamber makes the bill public; the legislature's officials always.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { toAkomaNtoso } from '@/lib/law/akoma-ntoso';
import { getBill, publicBill, readsFullRecord, stageLabel } from '@/lib/legislature/register';
import { getSovereign } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const b = getBill(decodeURIComponent(id));
  if (!b || !(readsFullRecord(await caseScope(), b) || publicBill(b.id))) return NextResponse.json({ error: 'No such bill' }, { status: 404 });
  const n = Number(req.nextUrl.searchParams.get('version') ?? b.texts.at(-1)!.n);
  const t = b.texts.find(x => x.n === n);
  if (!t) return NextResponse.json({ error: 'No such version of the text' }, { status: 404 });
  const slug = b.number.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'bill';
  const year = (b.journal[0]?.date ?? t.date).slice(0, 4);
  const work = `/eli/${(getSovereign().iso3 ?? 'national').toLowerCase()}/bill/${year}/${slug}`;
  const lifecycle = b.journal.filter(j => ['introduced', 'stage', 'vote', 'passed', 'assent', 'publication'].includes(j.kind)).map(j => ({ date: j.date, name: j.kind === 'stage' ? stageLabel(b, j.stage) : j.kind }));
  const xml = toAkomaNtoso({ id: work, title: b.title, type: b.instrumentType }, { language: b.language, dates: { adopted: b.journal[0]?.date ?? t.date, inForce: t.date }, provisions: t.provisions }, { doc: 'bill', lifecycle });
  return new NextResponse(xml, { headers: { 'content-type': 'application/akn+xml; charset=utf-8', 'content-disposition': `attachment; filename="${slug}-v${t.n}.xml"` } });
}
