// The token buckets behind the API rate limits (review S9), with no Node or
// sign-in dependency so the middleware (edge runtime) and the routes share
// the same rules: lib/ops/rate-limit.ts applies a scope inside a route, the
// middleware applies `write` (or `public`) to every other change. Buckets
// live in memory of the running server (protection, not records: never
// persisted; the key is outside `__civicos*`).

import { NextResponse } from 'next/server';

export interface Policy { perMinute: number; burst: number }
/** Limits by scope; a route names its scope. */
export const POLICIES = {
  /** Large uploads (boundary files, district packs, site imports). */
  upload: { perMinute: 6, burst: 3 },
  /** Position and file checks officials run while filling a form. */
  check: { perMinute: 120, burst: 30 },
  /** Changes made through the console. */
  write: { perMinute: 120, burst: 40 },
  /** Public reads and writes that cost work (search, open data, email updates). */
  public: { perMinute: 60, burst: 20 },
} satisfies Record<string, Policy>;
export type Scope = keyof typeof POLICIES;

interface Bucket { tokens: number; at: number }
const MAX_BUCKETS = 50_000;
const g = globalThis as unknown as { __rateLimitBuckets?: Map<string, Bucket> };
const buckets = (): Map<string, Bucket> => (g.__rateLimitBuckets ??= new Map());

/** Take one token; returns what is left and how long until the next one. */
export function take(key: string, p: Policy, now = Date.now()): { ok: boolean; remaining: number; retryAfterS: number } {
  const all = buckets();
  const rate = p.perMinute / 60_000;
  const b = all.get(key) ?? { tokens: p.burst, at: now };
  b.tokens = Math.min(p.burst, b.tokens + (now - b.at) * rate);
  b.at = now;
  const ok = b.tokens >= 1;
  if (ok) b.tokens -= 1;
  if (!all.has(key) && all.size >= MAX_BUCKETS) all.delete(all.keys().next().value!);
  all.set(key, b);
  return { ok, remaining: Math.floor(b.tokens), retryAfterS: ok ? 0 : Math.ceil((1 - b.tokens) / rate / 1000) };
}

export function resetRateLimits(): void { buckets().clear(); }

/** The client address a request came from (the ingress's X-Forwarded-For first hop, else X-Real-IP). */
export function clientAddress(headers: { get(name: string): string | null }): string {
  const fwd = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return fwd || headers.get('x-real-ip') || 'unknown';
}

/** The 429 answer: Retry-After and the RateLimit headers (IETF draft) so well-behaved clients slow down. */
export function tooMany(scope: Scope, retryAfterS: number): NextResponse {
  const p = POLICIES[scope];
  return NextResponse.json({ error: `Too many requests: at most ${p.perMinute} a minute here. Try again in ${retryAfterS} s.` }, {
    status: 429,
    headers: { 'retry-after': String(retryAfterS), 'ratelimit-limit': String(p.perMinute), 'ratelimit-remaining': '0', 'ratelimit-reset': String(retryAfterS) },
  });
}
