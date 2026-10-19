// Disconnect a case system: POST { action: 'revoke' }. Its key stops working
// at once; the cases it sent stay. Audited.
import { NextRequest, NextResponse } from 'next/server';
import { revokeFeed } from '@/lib/data/case-import';
import { withOfficial, refusal } from '@/lib/auth/official';
import { canManageFeeds } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string; feedId: string }> }
) {
  const params = await props.params;
  const refused = await refusal(s => canManageFeeds(s, params.id));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { action?: string; by?: string };
  if (b.action !== 'revoke') return NextResponse.json({ error: 'action must be revoke' }, { status: 422 });
  const r = revokeFeed(params.id, params.feedId, b.by);
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'No such connected system' ? 404 : 422 });
  return NextResponse.json({ feed: r });
}
