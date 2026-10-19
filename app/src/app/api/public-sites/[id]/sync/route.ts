import { NextRequest, NextResponse } from 'next/server';
import { syncSiteFeed } from '@/lib/data/site-settings';
import { SITE_IDS } from '@/lib/public-sites';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

/** Fetch the site's news feed now; a failure keeps the last good copy. */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!SITE_IDS.includes(params.id)) return NextResponse.json({ error: 'No such site' }, { status: 404 });
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string };
  const site = await syncSiteFeed(params.id, b.by?.trim() || 'official');
  return NextResponse.json({ site });
}
