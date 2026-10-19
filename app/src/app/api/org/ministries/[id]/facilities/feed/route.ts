// A ministry's own system of record sending its sites to the national facility
// register (lib/data/facilities.ts), authenticated by the system's key
// (Authorization: Bearer csf_…), never a session. POST { sites: [{ ref, name,
// category, lat, lng, accuracyM?, status?, code?, region?, operator? }] }: new
// refs are proposed under the same checks as a form (an official publishes
// them); refs this system sent before are updated (name and status applied,
// a new position waits for an official to confirm); refusals come back by
// position. GET ?since=<date-time>: what officials did with this system's sites.
// When the institution registered a public key for this system
// (…/facilities/feeds/[feedId]/signing-key), every call must also be signed
// (RFC 9421, Ed25519, with Content-Digest) by that key.
import { NextRequest, NextResponse } from 'next/server';
import { receiveSiteFeed, siteFeedChanges, siteFeedForKey } from '@/lib/data/facilities';
import { checkFeedSignature } from '@/lib/exchange/feed-keys';
import { recordAudit } from '@/lib/data/store';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 4_000_000;
const denied = () => NextResponse.json({ error: 'Send this system\'s key: Authorization: Bearer csf_…' }, { status: 401 });

/** Refuse an unsigned or badly signed call when the feed has a registered key (audited). */
function badSignature(feed: { id: string; name: string; prefix: string }, req: NextRequest, raw: string): NextResponse | null {
  const s = checkFeedSignature('site', feed.id, req, raw);
  if (!s.required || s.ok) return null;
  recordAudit(`Site system: ${feed.name} (csf_${feed.prefix}…)`, 'exchange.signature', `SiteFeed:${feed.id}`, 'denied', s.reason);
  return NextResponse.json({ error: s.reason }, { status: 401 });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const feed = siteFeedForKey(params.id, req.headers.get('authorization'));
  if (!feed) return denied();
  const raw = await req.text();
  if (Buffer.byteLength(raw) > MAX_BYTES) return NextResponse.json({ error: 'A call is at most 4 MB; send fewer sites at a time' }, { status: 413 });
  const unsigned = badSignature(feed, req, raw);
  if (unsigned) return unsigned;
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'The body must be JSON' }, { status: 400 }); }
  const r = await receiveSiteFeed(feed, body, raw);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json(r);
}

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const feed = siteFeedForKey(params.id, req.headers.get('authorization'));
  if (!feed) return denied();
  const unsigned = badSignature(feed, req, '');
  if (unsigned) return unsigned;
  const r = siteFeedChanges(feed, req.nextUrl.searchParams.get('since'));
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ ...r, asOf: new Date().toISOString() });
}
