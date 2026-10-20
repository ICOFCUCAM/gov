// API rate limits (architecture review S9, R15). Token buckets per caller
// and scope: a signed-in official is limited by account, anyone else by
// client address. Answers 429 with Retry-After and the RateLimit headers
// (IETF draft) so well-behaved clients slow down. Buckets live in memory of
// the running server (they are protection, not records: never persisted).
//
// The buckets and policies are in ./rate-limit-core, shared with the
// middleware, which limits every change a route does not limit itself
// (`write`, or `public` for the citizens' email-update requests). A route
// that needs a tighter scope (uploads, checks) applies it here.

import type { NextRequest, NextResponse } from 'next/server';
import { currentOfficial } from '@/lib/auth/official';
import { logger, requestIdOf } from '@/lib/ops/log';
import { POLICIES, take, tooMany, clientAddress, type Scope } from './rate-limit-core';

export { POLICIES, take, resetRateLimits, type Policy, type Scope } from './rate-limit-core';

/** The caller: the signed-in official's account, else the client address. */
export async function callerOf(req: NextRequest): Promise<string> {
  const o = await currentOfficial().catch(() => null);
  if (o) return `o:${(o as { sub?: string; id?: string; name?: string }).sub ?? (o as { id?: string }).id ?? (o as { name?: string }).name}`;
  return `a:${clientAddress(req.headers)}`;
}

/** Apply a scope's limit to a request: null to go on, or the 429 answer. */
export async function limit(req: NextRequest, scope: Scope): Promise<NextResponse | null> {
  const p = POLICIES[scope];
  const r = take(`${scope}|${await callerOf(req)}`, p);
  if (r.ok) return null;
  logger.warn('ratelimit.refused', { requestId: requestIdOf(req.headers), scope, route: req.nextUrl.pathname, retryAfterS: r.retryAfterS });
  return tooMany(scope, r.retryAfterS);
}
