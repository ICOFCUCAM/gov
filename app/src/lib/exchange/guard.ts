// The doors in front of the exchange log (go-live review M-4). Feed and
// federation calls authenticate themselves (their own key), so the
// middleware's limits do not apply to them; these checks do, in this order:
//
// 1. a limit per client address, before the key is looked up;
// 2. a caller whose key is not recognised is answered 401 without a signed
//    receipt and is not written to the exchange log: it is only counted in
//    the log's bounded summary of unauthenticated calls, so a flood cannot
//    evict the evidence of real exchanges;
// 3. a limit per key, once the key is known;
// 4. the declared body size, before the body is read.

import { NextResponse, type NextRequest } from 'next/server';
import { POLICIES, take, clientAddress, tooMany } from '@/lib/ops/rate-limit-core';
import { logger, requestIdOf } from '@/lib/ops/log';
import { noteUnauthenticated, type ExchangeChannel } from './log';

interface Where { channel: ExchangeChannel; ministryId?: string }

function refused(req: NextRequest, w: Where, retryAfterS: number, by: 'address' | 'key', feedId?: string): NextResponse {
  noteUnauthenticated({ channel: w.channel, ministryId: w.ministryId, feedId, result: `rate limited (${by})` });
  logger.warn('ratelimit.refused', { requestId: requestIdOf(req.headers), scope: 'feed', by, route: req.nextUrl.pathname, retryAfterS });
  return tooMany('feed', retryAfterS);
}

/** Per client address, before any key lookup: null to go on, or the 429 answer. */
export function addressGate(req: NextRequest, w: Where): NextResponse | null {
  const r = take(`feed|a:${clientAddress(req.headers)}`, POLICIES.feed);
  return r.ok ? null : refused(req, w, r.retryAfterS, 'address');
}

/** Per key (the feed or integration client it belongs to), once known. */
export function keyGate(req: NextRequest, w: Where, keyOwner: string): NextResponse | null {
  const r = take(`feed|k:${keyOwner}`, POLICIES.feed);
  return r.ok ? null : refused(req, w, r.retryAfterS, 'key', keyOwner);
}

/** A caller without a recognised key: counted, not logged or signed. */
export function unknownCaller(w: Where, status: number, result: string, json: Record<string, unknown>, headers: Record<string, string> = {}): NextResponse {
  noteUnauthenticated({ channel: w.channel, ministryId: w.ministryId, result });
  return NextResponse.json(json, { status, headers });
}

/** The body size the request declares is over `max` (checked before reading it; the read length is checked after). */
export function declaresTooLarge(req: NextRequest, max: number): boolean {
  const n = Number(req.headers.get('content-length') ?? '');
  return Number.isFinite(n) && n > max;
}
