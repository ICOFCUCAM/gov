// /api/releases/security/byo — register the nation's own security tooling
// and attest to its last scan. No purchase is needed.
import { NextRequest, NextResponse } from 'next/server';
import { registerByo } from '@/lib/data/security-store';
import { chamberBody } from '@/lib/updates/access';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const r = await chamberBody<Record<string, unknown>>(req);
  if (r instanceof NextResponse) return r;
  const { link: _link, ...input } = r.b;
  const out = registerByo(r.nation, input as Parameters<typeof registerByo>[1]);
  if ('error' in out) return NextResponse.json(out, { status: 422 });
  return NextResponse.json({ tool: out }, { status: 201 });
}
