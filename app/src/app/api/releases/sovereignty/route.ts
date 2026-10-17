// /api/releases/sovereignty — which categories of operational data may leave
// the country (all off unless enabled), with a sample of exactly what each
// would share (GET). POST: enable (named approver + reason) or disable a
// category. Audited.
import { NextRequest, NextResponse } from 'next/server';
import { nationFor, chamberBody } from '@/lib/updates/access';
import { DATA_CATEGORIES, samplePayload, setSharing, sharing } from '@/lib/data/sovereignty';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  const ctx = { version: n.installedVersion, releaseId: n.installedReleaseId };
  return NextResponse.json({ categories: DATA_CATEGORIES.map(c => ({ ...c, sample: samplePayload(c.key, ctx) })), state: sharing(n.id) });
}

export async function POST(req: NextRequest) {
  const body = await chamberBody<{ category?: string; enabled?: boolean; by?: string; reason?: string }>(req);
  if (body instanceof NextResponse) return body;
  const out = setSharing(body.nation.id, String(body.b.category ?? ''), body.b);
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ state: sharing(body.nation.id) });
}
