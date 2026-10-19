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
// (RFC 9421, Ed25519, with Content-Digest) by that key. Every call with a
// recognised key is recorded in the exchange log (lib/exchange/log.ts) and answered with a
// receipt signed by the platform (`receipt`, and the CivicOS-Receipt header).
import { readText, TOO_LARGE as OVER_CAP } from '@/lib/net/body-limit';
import { NextRequest, NextResponse } from 'next/server';
import { receiveSiteFeed, siteFeedChanges, siteFeedForKey, type SiteFeed } from '@/lib/data/facilities';
import { checkFeedSignature } from '@/lib/exchange/feed-keys';
import { exchangeResponse, type SignatureState } from '@/lib/exchange/log';
import { addressGate, keyGate, unknownCaller, declaresTooLarge } from '@/lib/exchange/guard';
import { recordAudit } from '@/lib/data/store';
// Calls are limited per address and per key, and calls without a recognised key are only counted,
// never logged or signed (lib/exchange/guard.ts, go-live review M-4).
export const dynamic = 'force-dynamic';

const MAX_BYTES = 4_000_000;
const TOO_LARGE = 'A call is at most 4 MB; send fewer sites at a time';
const KEY_HELP = 'Send this system\'s key: Authorization: Bearer csf_…';

function answer(req: NextRequest, ministryId: string, feed: SiteFeed, body: string, sig: { state: SignatureState; keyId?: string }, status: number, json: Record<string, unknown>, result: string): Promise<NextResponse> {
  return exchangeResponse({ channel: 'site-feed', feedId: feed.id, ministryId, method: req.method, path: req.nextUrl.pathname, body, signature: sig.state, signatureKeyId: sig.keyId, status, result }, json);
}

/** The signature state of a call; refused (and audited) when the feed has a key and the call is not signed by it. */
function signatureOf(feed: SiteFeed, req: NextRequest, raw: string): { state: SignatureState; keyId?: string; reason?: string } {
  const s = checkFeedSignature('site', feed.id, req, raw);
  if (!s.required) return { state: 'absent' };
  if (s.ok) return { state: 'verified', keyId: s.keyId };
  recordAudit(`Site system: ${feed.name} (csf_${feed.prefix}…)`, 'exchange.signature', `SiteFeed:${feed.id}`, 'denied', s.reason);
  return { state: 'refused', keyId: s.keyId, reason: s.reason };
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // Limits and the unknown-key answer come before the body is read or anything is logged or signed (review M-4).
  const where = { channel: 'site-feed' as const, ministryId: params.id };
  const busy = addressGate(req, where);
  if (busy) return busy;
  const feed = siteFeedForKey(params.id, req.headers.get('authorization'));
  if (!feed) return unknownCaller(where, 401, 'unknown key', { error: KEY_HELP });
  const busyKey = keyGate(req, where, feed.id);
  if (busyKey) return busyKey;
  if (declaresTooLarge(req, MAX_BYTES)) return answer(req, params.id, feed, '', { state: 'absent' }, 413, { error: TOO_LARGE }, 'too large (declared length)');
  // Read with the byte cap, also when no length is declared (lib/net/body-limit.ts, review L-4).
  const read = await readText(req, MAX_BYTES);
  if (read === OVER_CAP) return answer(req, params.id, feed, '', { state: 'absent' }, 413, { error: TOO_LARGE }, 'too large');
  const raw = read;
  const sig = signatureOf(feed, req, raw);
  if (sig.reason) return answer(req, params.id, feed, raw, sig, 401, { error: sig.reason }, `signature refused: ${sig.reason}`);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return answer(req, params.id, feed, raw, sig, 400, { error: 'The body must be JSON' }, 'not JSON'); }
  const r = await receiveSiteFeed(feed, body, raw);
  if ('error' in r) return answer(req, params.id, feed, raw, sig, 422, r, r.error);
  return answer(req, params.id, feed, raw, sig, 200, r as unknown as Record<string, unknown>, summary(r));
}

function summary(r: object): string {
  const o = r as Record<string, unknown>;
  const parts = ['added', 'updated', 'unchanged', 'movesWaiting'].filter(k => typeof o[k] === 'number').map(k => `${o[k]} ${k === 'movesWaiting' ? 'moves waiting' : k}`);
  if (Array.isArray(o.refused)) parts.push(`${o.refused.length} refused`);
  return parts.join(', ') || 'received';
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const where = { channel: 'site-feed' as const, ministryId: params.id };
  const busy = addressGate(req, where);
  if (busy) return busy;
  const feed = siteFeedForKey(params.id, req.headers.get('authorization'));
  if (!feed) return unknownCaller(where, 401, 'unknown key', { error: KEY_HELP });
  const busyKey = keyGate(req, where, feed.id);
  if (busyKey) return busyKey;
  const sig = signatureOf(feed, req, '');
  if (sig.reason) return answer(req, params.id, feed, '', sig, 401, { error: sig.reason }, `signature refused: ${sig.reason}`);
  const r = siteFeedChanges(feed, req.nextUrl.searchParams.get('since'));
  if ('error' in r) return answer(req, params.id, feed, '', sig, 422, r, r.error);
  return answer(req, params.id, feed, '', sig, 200, { ...r, asOf: new Date().toISOString() }, `${r.sites.length} changes read`);
}
