// A ministry's own case system talking to its queue (lib/data/case-import.ts),
// authenticated by the system's key (Authorization: Bearer ccf_…), never a
// session. POST { cases: [{ reference, subject, received, region?, priority?,
// assignee?, note?, state? }] }: new references are added under the same
// checks as a loaded file, references this system sent before are updated
// (state open | assigned | escalated | closed), every refusal comes back by
// position. GET ?since=<date-time>: what officials did here to this system's
// cases since then. Every call is audited. When the institution registered a
// public key for this system (…/queue/feeds/[feedId]/signing-key), every call
// must also be signed (RFC 9421, Ed25519, with Content-Digest) by that key.
// Every call with a recognised key is recorded in the exchange log (lib/exchange/log.ts) and
// answered with a receipt signed by the platform (`receipt`, and the
// CivicOS-Receipt header), so both sides keep the record.
import { NextRequest, NextResponse } from 'next/server';
import { feedForKey, receiveFeed, feedChanges, MAX_BYTES } from '@/lib/data/case-import';
import type { CaseFeed } from '@/lib/api/types';
import { checkFeedSignature } from '@/lib/exchange/feed-keys';
import { exchangeResponse, type SignatureState } from '@/lib/exchange/log';
import { addressGate, keyGate, unknownCaller, declaresTooLarge } from '@/lib/exchange/guard';
import { recordAudit } from '@/lib/data/store';
// Calls are limited per address and per key, and calls without a recognised key are only counted,
// never logged or signed (lib/exchange/guard.ts, go-live review M-4).
export const dynamic = 'force-dynamic';

const TOO_LARGE = 'A call is at most 2 MB; send fewer cases at a time';
const KEY_HELP = 'Send this system\'s key: Authorization: Bearer ccf_…';

function answer(req: NextRequest, ministryId: string, feed: CaseFeed, body: string, sig: { state: SignatureState; keyId?: string }, status: number, json: Record<string, unknown>, result: string): Promise<NextResponse> {
  return exchangeResponse({ channel: 'case-feed', feedId: feed.id, ministryId, method: req.method, path: req.nextUrl.pathname, body, signature: sig.state, signatureKeyId: sig.keyId, status, result }, json);
}

/** The signature state of a call; refused (and audited) when the feed has a key and the call is not signed by it. */
function signatureOf(feed: CaseFeed, req: NextRequest, raw: string): { state: SignatureState; keyId?: string; reason?: string } {
  const s = checkFeedSignature('case', feed.id, req, raw);
  if (!s.required) return { state: 'absent' };
  if (s.ok) return { state: 'verified', keyId: s.keyId };
  recordAudit(`Case system: ${feed.name} (ccf_${feed.prefix}…)`, 'exchange.signature', `CaseFeed:${feed.id}`, 'denied', s.reason);
  return { state: 'refused', keyId: s.keyId, reason: s.reason };
}

/**
 * @example request {"cases":[{"reference":"CASE-2026-0001","subject":"Permit application","received":"2026-01-15","priority":"normal","state":"open"}]}
 * @example response 200 {"added":1,"updated":0,"unchanged":0,"refused":[],"receipt":{"v":"civicos-exchange-receipt-v1","id":"…","at":"2026-01-15T09:30:00.000Z","channel":"case-feed","status":200,"result":"1 added, 0 updated, 0 unchanged, 0 refused","platformKeyId":"ed25519:…","signature":"…"}}
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // Limits and the unknown-key answer come before the body is read or anything is logged or signed (review M-4).
  const where = { channel: 'case-feed' as const, ministryId: params.id };
  const busy = addressGate(req, where);
  if (busy) return busy;
  const feed = feedForKey(params.id, req.headers.get('authorization'));
  if (!feed) return unknownCaller(where, 401, 'unknown key', { error: KEY_HELP });
  const busyKey = keyGate(req, where, feed.id);
  if (busyKey) return busyKey;
  if (declaresTooLarge(req, MAX_BYTES)) return answer(req, params.id, feed, '', { state: 'absent' }, 413, { error: TOO_LARGE }, 'too large (declared length)');
  const raw = await req.text();
  if (Buffer.byteLength(raw) > MAX_BYTES) return answer(req, params.id, feed, raw, { state: 'absent' }, 413, { error: TOO_LARGE }, 'too large');
  const sig = signatureOf(feed, req, raw);
  if (sig.reason) return answer(req, params.id, feed, raw, sig, 401, { error: sig.reason }, `signature refused: ${sig.reason}`);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return answer(req, params.id, feed, raw, sig, 400, { error: 'The body must be JSON' }, 'not JSON'); }
  const r = receiveFeed(feed, body, raw);
  if ('error' in r) return answer(req, params.id, feed, raw, sig, 422, r, r.error);
  return answer(req, params.id, feed, raw, sig, 200, r, `${r.added} added, ${r.updated} updated, ${r.unchanged} unchanged, ${r.refused.length} refused`);
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const where = { channel: 'case-feed' as const, ministryId: params.id };
  const busy = addressGate(req, where);
  if (busy) return busy;
  const feed = feedForKey(params.id, req.headers.get('authorization'));
  if (!feed) return unknownCaller(where, 401, 'unknown key', { error: KEY_HELP });
  const busyKey = keyGate(req, where, feed.id);
  if (busyKey) return busyKey;
  const sig = signatureOf(feed, req, '');
  if (sig.reason) return answer(req, params.id, feed, '', sig, 401, { error: sig.reason }, `signature refused: ${sig.reason}`);
  const r = feedChanges(feed, req.nextUrl.searchParams.get('since'));
  if ('error' in r) return answer(req, params.id, feed, '', sig, 422, r, r.error);
  return answer(req, params.id, feed, '', sig, 200, { ...r, asOf: new Date().toISOString() }, `${r.cases.length} changes read`);
}
