// A ministry's own system of record sending its sites to the national facility
// register (lib/data/facilities.ts), authenticated by the system's key
// (Authorization: Bearer csf_…), never a session. POST { sites: [{ ref, name,
// category, lat, lng, accuracyM?, status?, code?, region?, operator? }] }: new
// refs are proposed under the same checks as a form (an official publishes
// them); refs this system sent before are updated (name and status applied,
// a new position waits for an official to confirm); refusals come back by
// position. GET ?since=<date-time>: what officials did with this system's sites.
import { NextRequest, NextResponse } from 'next/server';
import { receiveSiteFeed, siteFeedChanges, siteFeedForKey } from '@/lib/data/facilities';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 4_000_000;
const denied = () => NextResponse.json({ error: 'Send this system\'s key: Authorization: Bearer csf_…' }, { status: 401 });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const feed = siteFeedForKey(params.id, req.headers.get('authorization'));
  if (!feed) return denied();
  const raw = await req.text();
  if (Buffer.byteLength(raw) > MAX_BYTES) return NextResponse.json({ error: 'A call is at most 4 MB; send fewer sites at a time' }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'The body must be JSON' }, { status: 400 }); }
  const r = await receiveSiteFeed(feed, body, raw);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json(r);
}

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const feed = siteFeedForKey(params.id, req.headers.get('authorization'));
  if (!feed) return denied();
  const r = siteFeedChanges(feed, req.nextUrl.searchParams.get('since'));
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ ...r, asOf: new Date().toISOString() });
}
