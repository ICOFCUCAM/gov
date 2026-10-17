// /api/releases/break-glass — the worst case: two named people restore the
// restore point taken before the running release was installed.
import { NextRequest, NextResponse } from 'next/server';
import { breakGlass } from '@/lib/data/updates';
import { chamberBody } from '@/lib/updates/access';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const r = await chamberBody<{ by?: string; secondBy?: string; reason?: string }>(req);
  if (r instanceof NextResponse) return r;
  const s = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const out = breakGlass(r.nation.id, { by: s(r.b.by), secondBy: s(r.b.secondBy), reason: s(r.b.reason) });
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json(out);
}
