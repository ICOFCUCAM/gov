// /api/releases/[id]/restore-data — restore the data snapshot taken before
// this release was installed. The last resort, never automatic: a named
// person, the software already back on the snapshot's version, and an
// explicit acknowledgement that everything written since is lost.
import { NextRequest, NextResponse } from 'next/server';
import { restoreData } from '@/lib/data/updates';
import { chamberBody } from '@/lib/updates/access';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await chamberBody<{ by?: string; acknowledgeLoss?: boolean }>(req);
  if (r instanceof NextResponse) return r;
  const out = restoreData(r.nation.id, params.id, { by: typeof r.b.by === 'string' ? r.b.by : undefined, acknowledgeLoss: r.b.acknowledgeLoss === true });
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json(out);
}
