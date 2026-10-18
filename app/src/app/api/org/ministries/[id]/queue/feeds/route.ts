// The case systems connected to an institution's queue. GET lists them (never
// their keys). POST { name } connects one and returns its key once; only an
// administrator or an official who can sign for the institution may (roles).
import { NextRequest, NextResponse } from 'next/server';
import { listFeeds, issueFeed } from '@/lib/data/case-import';
import { getMinistry } from '@/lib/data/store';
import { withOfficial, refusal } from '@/lib/auth/official';
import { canManageFeeds } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';

export function GET(_r: Request, { params }: { params: { id: string } }) {
  if (!getMinistry(params.id)) return NextResponse.json({ error: 'Ministry not found' }, { status: 404 });
  return NextResponse.json({ feeds: listFeeds(params.id) });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const refused = await refusal(s => canManageFeeds(s, params.id));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { name?: string; by?: string };
  const r = issueFeed(params.id, b.name, b.by);
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'Ministry not found' ? 404 : 422 });
  return NextResponse.json(r, { status: 201 });
}
