// /api/releases/publisher/evidence?nationId=&releaseId= — the publisher
// produces a nation's evidence pack for a release (e.g. for that nation's
// auditors), from the same records the nation sees.
import { NextRequest, NextResponse } from 'next/server';
import { publisherAuthorized, unauthorized } from '@/lib/updates/access';
import { evidencePack } from '@/lib/data/evidence';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  const u = new URL(req.url);
  const pack = evidencePack(u.searchParams.get('nationId') ?? '', u.searchParams.get('releaseId') ?? '');
  if (!pack) return NextResponse.json({ error: 'No such release for that nation' }, { status: 404 });
  return NextResponse.json({ pack });
}
