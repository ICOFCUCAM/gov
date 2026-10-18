// The systems connected to an institution's sites. GET lists them (never their
// keys). POST { name } connects one and returns its key once; only an
// administrator or an official who can sign for the institution may (roles).
import { NextRequest, NextResponse } from 'next/server';
import { issueSiteFeed, listSiteFeeds } from '@/lib/data/facilities';
import { getMinistry } from '@/lib/data/store';
import { refusal, withOfficial } from '@/lib/auth/official';
import { canManageFeeds } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';

export function GET(_r: NextRequest, { params }: { params: { id: string } }) {
  if (!getMinistry(params.id)) return NextResponse.json({ error: 'Ministry not found' }, { status: 404 });
  return NextResponse.json({ feeds: listSiteFeeds(params.id) });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const refused = await refusal(s => canManageFeeds(s, params.id));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { name?: string; by?: string };
  const r = issueSiteFeed(params.id, b.name, b.by);
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'No such institution' ? 404 : 422 });
  return NextResponse.json(r, { status: 201 });
}
