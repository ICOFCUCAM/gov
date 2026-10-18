// A ministry's own case system talking to its queue (lib/data/case-import.ts),
// authenticated by the system's key (Authorization: Bearer ccf_…), never a
// session. POST { cases: [{ reference, subject, received, region?, priority?,
// assignee?, note?, state? }] }: new references are added under the same
// checks as a loaded file, references this system sent before are updated
// (state open | assigned | escalated | closed), every refusal comes back by
// position. GET ?since=<date-time>: what officials did here to this system's
// cases since then. Every call is audited.
import { NextRequest, NextResponse } from 'next/server';
import { feedForKey, receiveFeed, feedChanges, MAX_BYTES } from '@/lib/data/case-import';
export const dynamic = 'force-dynamic';

const denied = () => NextResponse.json({ error: 'Send this system\'s key: Authorization: Bearer ccf_…' }, { status: 401 });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const feed = feedForKey(params.id, req.headers.get('authorization'));
  if (!feed) return denied();
  const raw = await req.text();
  if (Buffer.byteLength(raw) > MAX_BYTES) return NextResponse.json({ error: 'A call is at most 2 MB; send fewer cases at a time' }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'The body must be JSON' }, { status: 400 }); }
  const r = receiveFeed(feed, body, raw);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json(r);
}

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const feed = feedForKey(params.id, req.headers.get('authorization'));
  if (!feed) return denied();
  const r = feedChanges(feed, req.nextUrl.searchParams.get('since'));
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ ...r, asOf: new Date().toISOString() });
}
