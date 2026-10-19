// Token buckets for per-caller rate limits (review S9): integration keys
// (`rateLimitRpm`), and later per-official limits. Counters are kept in
// memory only (a restart refills every bucket); they live on globalThis under
// a key persist.ts does not save.

interface Bucket { tokens: number; at: number }
const g = globalThis as unknown as { __rateBuckets?: Map<string, Bucket> };
const buckets = () => (g.__rateBuckets ??= new Map());

export interface RateDecision { allowed: boolean; remaining: number; retryAfterSeconds?: number }

/**
 * Take one token from `key`'s bucket, which holds `perMinute` tokens and
 * refills at `perMinute` per minute. Refused (with when to retry) when empty.
 */
export function take(key: string, perMinute: number, now = Date.now()): RateDecision {
  const cap = Math.max(1, Math.floor(perMinute));
  const rate = cap / 60_000;
  const b = buckets().get(key) ?? { tokens: cap, at: now };
  b.tokens = Math.min(cap, b.tokens + Math.max(0, now - b.at) * rate);
  b.at = now;
  buckets().set(key, b);
  if (b.tokens < 1) return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((1 - b.tokens) / rate / 1000)) };
  b.tokens -= 1;
  return { allowed: true, remaining: Math.floor(b.tokens) };
}

export function resetRateLimits(): void { g.__rateBuckets = undefined; }
