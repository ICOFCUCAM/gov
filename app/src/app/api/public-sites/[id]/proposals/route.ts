import { NextRequest, NextResponse } from 'next/server';
import { proposeSiteChange, proposeRestore, type SiteChange } from '@/lib/data/site-editorial';

export const dynamic = 'force-dynamic';

/** Propose a change to a site's content or design (or `restore` an earlier version); a second official publishes it. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const b = (await req.json().catch(() => ({}))) as { change?: SiteChange; restore?: number; note?: string; by?: string };
  const r = typeof b.restore === 'number'
    ? proposeRestore(params.id, b.restore, b.by ?? '', b.note)
    : proposeSiteChange(params.id, b.change ?? {}, b.by ?? '', b.note);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ proposal: r });
}
