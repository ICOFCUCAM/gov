import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { limit, resetRateLimits, take, POLICIES } from './rate-limit';
import { middleware } from '@/middleware';

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

describe('the middleware limits every other change', () => {
  const send = (path: string, ip: string, method = 'POST') => middleware(new NextRequest(`http://x${path}`, { method, headers: { 'x-forwarded-for': ip } }));

  it('applies `write` to changes no route limits itself, per caller', async () => {
    const codes: number[] = [];
    for (let i = 0; i < POLICIES.write.burst; i++) codes.push((await send('/api/ops/incidents', '203.0.113.20')).status);
    expect(codes.every(c => c !== 429)).toBe(true);
    const last = await send('/api/directives', '203.0.113.20', 'PUT');
    expect(last.status).toBe(429);
    expect(last.headers.get('ratelimit-limit')).toBe(String(POLICIES.write.perMinute));
    expect(last.headers.get('x-request-id')).toBeTruthy();
    expect((await send('/api/ops/incidents', '203.0.113.21')).status).not.toBe(429);
    // Reads are not counted.
    expect((await middleware(new NextRequest('http://x/api/sovereign', { headers: { 'x-forwarded-for': '203.0.113.20' } }))).status).not.toBe(429);
  });

  it('applies `public` to the citizens\' email-update requests', async () => {
    const codes: number[] = [];
    for (let i = 0; i < POLICIES.public.burst + 1; i++) codes.push((await send('/api/subscriptions', '198.51.100.30')).status);
    expect(codes.at(-1)).toBe(429);
    expect(codes.filter(c => c === 429)).toHaveLength(1);
  });

  it('keeps the routes\' own scopes and the machine callers\' own limits as they were', async () => {
    for (let i = 0; i < POLICIES.write.burst + 5; i++) {
      expect((await send('/api/boundaries', '198.51.100.40')).status).not.toBe(429); // upload scope, applied in the route
      expect((await send('/api/federation/exchange', '198.51.100.40')).status).not.toBe(429); // the integration key's rateLimitRpm
      expect((await send('/api/cron/twin-sources', '198.51.100.40')).status).not.toBe(429); // the cron secret
    }
  });
});
