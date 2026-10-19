// API rate limits (architecture review S9, R15). Token buckets per caller
// and scope: a signed-in official is limited by account, anyone else by
// client address. Answers 429 with Retry-After and the RateLimit headers
// (IETF draft) so well-behaved clients slow down. Buckets live in memory of
// the running server (they are protection, not records: never persisted).

import { NextResponse, type NextRequest } from 'next/server';
import { currentOfficial } from '@/lib/auth/official';
import { logger, requestIdOf } from '@/lib/ops/log';

export interface Policy { perMinute: number; burst: number }
/** Limits by scope; a route names its scope. */
export const POLICIES = {
  /** Large uploads (boundary files, district packs, site imports). */
  upload: { perMinute: 6, burst: 3 },
  /** Position and file checks officials run while filling a form. */
  check: { perMinute: 120, burst: 30 },
  /** Changes made through the console. */
  write: { perMinute: 120, burst: 40 },
  /** Public reads that cost work (search, open data). */
  public: { perMinute: 60, burst: 20 },
} satisfies Record<string, Policy>;
export type Scope = keyof typeof POLICIES;

interface Bucket { tokens: number; at: number }
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 50_000;

/** Take one token; returns what is left and how long until the next one. */
export function take(key: string, p: Policy, now = Date.now()): { ok: boolean; remaining: number; retryAfterS: number } {
  const rate = p.perMinute / 60_000;
  const b = buckets.get(key) ?? { tokens: p.burst, at: now };
  b.tokens = Math.min(p.burst, b.tokens + (now - b.at) * rate);
  b.at = now;
  const ok = b.tokens >= 1;
  if (ok) b.tokens -= 1;
  if (!buckets.has(key) && buckets.size >= MAX_BUCKETS) buckets.delete(buckets.keys().next().value!);
  buckets.set(key, b);
  return { ok, remaining: Math.floor(b.tokens), retryAfterS: ok ? 0 : Math.ceil((1 - b.tokens) / rate / 1000) };
}

export function resetRateLimits(): void { buckets.clear(); }

/** The caller: the signed-in official's account, else the client address. */
async function callerOf(req: NextRequest): Promise<string> {
  const o = await currentOfficial().catch(() => null);
  if (o) return `o:${(o as { sub?: string; id?: string; name?: string }).sub ?? (o as { id?: string }).id ?? (o as { name?: string }).name}`;
  const fwd = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return `a:${fwd || req.headers.get('x-real-ip') || 'unknown'}`;
}

/** Apply a scope's limit to a request: null to go on, or the 429 answer. */
export async function limit(req: NextRequest, scope: Scope): Promise<NextResponse | null> {
  const p = POLICIES[scope];
  const r = take(`${scope}|${await callerOf(req)}`, p);
  if (r.ok) return null;
  logger.warn('ratelimit.refused', { requestId: requestIdOf(req.headers), scope, route: req.nextUrl.pathname, retryAfterS: r.retryAfterS });
  return NextResponse.json({ error: `Too many requests: at most ${p.perMinute} a minute here. Try again in ${r.retryAfterS} s.` }, {
    status: 429,
    headers: { 'retry-after': String(r.retryAfterS), 'ratelimit-limit': String(p.perMinute), 'ratelimit-remaining': '0', 'ratelimit-reset': String(r.retryAfterS) },
  });
}
