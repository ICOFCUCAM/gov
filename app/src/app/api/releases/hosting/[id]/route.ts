// /api/releases/hosting/[id] — the nation accepts an issued assessment,
// asks for a revision, or withdraws its request.
import { NextRequest, NextResponse } from 'next/server';
import { nationAction } from '@/lib/data/hosting';
import { chamberBody } from '@/lib/updates/access';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await chamberBody<{ action?: string; by?: string; note?: string }>(req);
  if (r instanceof NextResponse) return r;
  const out = nationAction(r.nation, params.id, { action: r.b.action, by: r.b.by, note: r.b.note });
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ request: out });
}
