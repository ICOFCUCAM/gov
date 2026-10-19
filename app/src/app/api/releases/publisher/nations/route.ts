// /api/releases/publisher/nations — enrol a nation and issue its private
// distribution link.
import { NextRequest, NextResponse } from 'next/server';
import { enrolNation } from '@/lib/data/updates';
import { publisherAuthorized, unauthorized } from '@/lib/updates/access';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  let b: { name?: string; iso3?: string; deliveryMode?: string; installedVersion?: string; by?: string };
  try { b = await withOfficial(await req.json()); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const r = enrolNation(b ?? {});
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ nation: r }, { status: 201 });
}
