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
  /** Cheap public reads answered from a cache (the audit chain's verification; go-live review M-8). */
  publicRead: { perMinute: 120, burst: 40 },
  /** Connected systems and federation partners, per address before the key is known and per key after (review M-4). */
  feed: { perMinute: 120, burst: 60 },
  /** Public checks of a person on a register (regulated professionals): one person at a time, never a harvest. */
  registerCheck: { perMinute: 20, burst: 10 },
  /** Sign-in and reset-code attempts per address (review M-9); the lockout per account stays in lib/auth/officials.ts. */
  signin: { perMinute: 10, burst: 10 },
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

/**
 * How many proxies in front of the platform append to X-Forwarded-For
 * (go-live review L-1): CIVICOS_TRUSTED_PROXIES, default 0. The server itself
 * appends the address the connection came from as the last hop
 * (lib/ops/peer-address.ts, started from src/instrumentation.ts), so with 0
 * the address is that connection's and nothing a caller writes in the header
 * counts. Behind one proxy that appends (ingress-nginx, the compose edge with
 * $proxy_add_x_forwarded_for, an AWS ALB) set 1; behind a load balancer and
 * an ingress, 2. On a platform that replaces the header with the caller's own
 * address and runs no Node server of ours (Vercel), leave it at 0.
 */
export function trustedProxies(env: Record<string, string | undefined> = process.env): number {
  const n = Number.parseInt(env.CIVICOS_TRUSTED_PROXIES ?? '', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10) : 0;
}

/**
 * The client address a request came from, for every per-address limit (the
 * middleware, lib/ops/rate-limit.ts, the exchange guard and the email-update
 * requests): the hop that many trusted proxies from the right of
 * X-Forwarded-For, never one further left (those the caller writes). When
 * the header has fewer hops, the left-most is taken (the proxies in front
 * sent the caller's own). X-Real-IP counts only behind a trusted proxy.
 */
export function clientAddress(headers: { get(name: string): string | null }, proxies = trustedProxies()): string {
  const hops = (headers.get('x-forwarded-for') ?? '').split(',').map(h => h.trim()).filter(Boolean);
  if (hops.length) return hops[Math.max(0, hops.length - 1 - proxies)]!;
  return (proxies > 0 ? headers.get('x-real-ip')?.trim() : '') || 'unknown';
}

/** The 429 answer: Retry-After and the RateLimit headers (IETF draft) so well-behaved clients slow down. */
export function tooMany(scope: Scope, retryAfterS: number): NextResponse {
  const p = POLICIES[scope];
  return NextResponse.json({ error: `Too many requests: at most ${p.perMinute} a minute here. Try again in ${retryAfterS} s.` }, {
    status: 429,
    headers: { 'retry-after': String(retryAfterS), 'ratelimit-limit': String(p.perMinute), 'ratelimit-remaining': '0', 'ratelimit-reset': String(retryAfterS) },
  });
}
