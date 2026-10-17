// /api/releases/staging — the nation's staging environment. Hosted nations
// have one provisioned; self-hosted and air-gapped nations register theirs.
import { NextRequest, NextResponse } from 'next/server';
import { nationFor, chamberBody } from '@/lib/updates/access';
import { registerStaging, stagingEnvironment } from '@/lib/data/readiness';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  return NextResponse.json({ staging: stagingEnvironment(n) });
}

export async function POST(req: NextRequest) {
  const body = await chamberBody<{ name?: string; url?: string; by?: string }>(req);
  if (body instanceof NextResponse) return body;
  const out = registerStaging(body.nation, body.b);
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ staging: out });
}
