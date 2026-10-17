import { NextRequest, NextResponse } from 'next/server';
import { syncSiteFeed } from '@/lib/data/site-settings';
import { SITE_IDS } from '@/lib/public-sites';

export const dynamic = 'force-dynamic';

/** Fetch the site's news feed now; a failure keeps the last good copy. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!SITE_IDS.includes(params.id)) return NextResponse.json({ error: 'No such site' }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { by?: string };
  const site = await syncSiteFeed(params.id, b.by?.trim() || 'official');
  return NextResponse.json({ site });
}
