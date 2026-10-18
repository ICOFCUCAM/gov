// /api/releases/publisher — the publisher console: every nation, every
// release and request (GET), and publishing a release (POST).
import { NextRequest, NextResponse } from 'next/server';
import { publisherOverview, publishRelease, superviseProbations, type PublishInput } from '@/lib/data/updates';
import { publisherAuthorized, unauthorized } from '@/lib/updates/access';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  superviseProbations();
  return NextResponse.json({ overview: publisherOverview() });
}

export async function POST(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  let b: PublishInput;
  try { b = await withOfficial(await req.json()); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!b || typeof b !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  const r = publishRelease(b);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ release: r }, { status: 201 });
}
