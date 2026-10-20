// API rate limits (architecture review S9, R15). Token buckets per caller
// and scope: a signed-in official is limited by account, anyone else by
// client address. Answers 429 with Retry-After and the RateLimit headers
// (IETF draft) so well-behaved clients slow down. Buckets live in memory of
// the running server (they are protection, not records: never persisted).
//
// The buckets and policies are in ./rate-limit-core, shared with the
// middleware, which limits every change a route does not limit itself
// (`write`, or `public` for the citizens' email-update requests). A route
// that needs a tighter scope (uploads, checks) applies it here. On a server
// running CIVICOS_STATE=postgres those buckets are shared by every instance
// (./shared-limits.ts), so more servers never mean more tries; if the
// database cannot answer, this server's own buckets apply.

import type { NextRequest, NextResponse } from 'next/server';
import { currentOfficial } from '@/lib/auth/official';
import { logger, requestIdOf } from '@/lib/ops/log';
import { recordsBackend } from '@/lib/data/persist';
import { POLICIES, take, tooMany, clientAddress, type Scope } from './rate-limit-core';
import { sharedTake } from './shared-limits';

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
  const key = `${scope}|${await callerOf(req)}`;
  const r = await takeShared(key, p);
  if (r.ok) return null;
  logger.warn('ratelimit.refused', { requestId: requestIdOf(req.headers), scope, route: req.nextUrl.pathname, retryAfterS: r.retryAfterS });
  return tooMany(scope, r.retryAfterS);
}

/** A token from the bucket every instance shares (postgres mode), else from this server's. */
async function takeShared(key: string, p: (typeof POLICIES)[Scope]): Promise<{ ok: boolean; retryAfterS: number }> {
  const sql = recordsBackend()?.sql;
  if (sql) {
    try { return await sharedTake(sql, key, p); }
    catch (e) { logger.warn('ratelimit.shared_unavailable', { message: (e as Error).message }); }
  }
  return take(key, p);
}
