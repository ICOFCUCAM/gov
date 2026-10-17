// /api/releases/security/software — register software the nation supplies
// itself. Covered by its own tooling (BYO) or any platform security licence.
import { NextRequest, NextResponse } from 'next/server';
import { registerSoftware } from '@/lib/data/security-store';
import { chamberBody } from '@/lib/updates/access';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const r = await chamberBody<{ name?: string; version?: string; kind?: string; by?: string }>(req);
  if (r instanceof NextResponse) return r;
  const { name, version, kind, by } = r.b;
  const out = registerSoftware(r.nation, { name, version, kind, by });
  if ('error' in out) return NextResponse.json(out, { status: 422 });
  return NextResponse.json({ software: out }, { status: 201 });
}
