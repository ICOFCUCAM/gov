// /api/releases/publisher/releases/[id] — publisher safety: halt, resume,
// withdraw (recall) a release, or promote it from the pilot ring to general
// availability.
import { NextRequest, NextResponse } from 'next/server';
import { setReleaseStatus } from '@/lib/data/updates';
import { publisherAuthorized, unauthorized } from '@/lib/updates/access';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await publisherAuthorized(req)) return unauthorized();
  let b: { action?: string; reason?: string; by?: string };
  try { b = await withOfficial(await req.json()); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const out = setReleaseStatus(params.id, b ?? {});
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ release: out });
}
