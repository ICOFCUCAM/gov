// Disconnect a system from an institution's sites: POST { action: 'revoke' }.
// Its key stops working at once; the sites it sent stay, with their history.
import { NextRequest, NextResponse } from 'next/server';
import { revokeSiteFeed } from '@/lib/data/facilities';
import { refusal, withOfficial } from '@/lib/auth/official';
import { canManageFeeds } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string; feedId: string } }) {
  const refused = await refusal(s => canManageFeeds(s, params.id));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { action?: string; by?: string };
  if (b.action !== 'revoke') return NextResponse.json({ error: 'action must be revoke' }, { status: 422 });
  const r = revokeSiteFeed(params.id, params.feedId, b.by);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ feed: r });
}
