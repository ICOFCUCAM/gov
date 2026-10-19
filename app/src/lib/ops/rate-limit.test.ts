import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { limit, resetRateLimits, take } from './rate-limit';

beforeEach(() => resetRateLimits());

describe('rate limits', () => {
  it('a bucket allows its burst, then refills at the stated rate', () => {
    const p = { perMinute: 60, burst: 3 };
    const t0 = 1_000_000;
    expect([1, 2, 3].map(() => take('k', p, t0).ok)).toEqual([true, true, true]);
    const no = take('k', p, t0);
    expect(no.ok).toBe(false);
    expect(no.retryAfterS).toBe(1);
    expect(take('k', p, t0 + 1000).ok).toBe(true);
    expect(take('other', p, t0).ok).toBe(true);
  });

  it('answers 429 with Retry-After and RateLimit headers once the scope is used up', async () => {
    const req = () => new NextRequest('http://x/api/boundaries', { method: 'POST', headers: { 'x-forwarded-for': '203.0.113.9' } });
    for (let i = 0; i < 3; i++) expect(await limit(req(), 'upload')).toBeNull();
    const r = await limit(req(), 'upload');
    expect(r?.status).toBe(429);
    expect(Number(r?.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(r?.headers.get('ratelimit-limit')).toBe('6');
    // Another caller is not affected.
    expect(await limit(new NextRequest('http://x/api/boundaries', { method: 'POST', headers: { 'x-forwarded-for': '198.51.100.4' } }), 'upload')).toBeNull();
  });
});
