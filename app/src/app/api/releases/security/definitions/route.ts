// /api/releases/security/definitions — apply the latest security
// definitions now (for nations on the manual policy).
import { NextRequest, NextResponse } from 'next/server';
import { applyDefinitions } from '@/lib/data/security-store';
import { chamberBody } from '@/lib/updates/access';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const r = await chamberBody<{ by?: string }>(req);
  if (r instanceof NextResponse) return r;
  const out = applyDefinitions(r.nation, typeof r.b.by === 'string' ? r.b.by : '');
  if ('error' in out) return NextResponse.json(out, { status: 422 });
  return NextResponse.json({ definitions: out });
}
