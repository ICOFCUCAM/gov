// Go-live review M-4: unauthenticated feed calls must not fill (and evict) the exchange log.
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { resetExchangeLog, listExchanges, listUnauthenticated, noteUnauthenticated, MAX_UNAUTHENTICATED_ROWS } from './log';
import { resetFeedKeys } from './feed-keys';
import { issueFeed } from '@/lib/data/case-import';
import { listMinistries } from '@/lib/data/store';
import { resetRateLimits, POLICIES } from '@/lib/ops/rate-limit';
import { POST as casePost, GET as caseGet } from '@/app/api/org/ministries/[id]/queue/feed/route';
import { POST as sitePost } from '@/app/api/org/ministries/[id]/facilities/feed/route';
import { POST as federationPost } from '@/app/api/federation/exchange/route';
import { GET as logGet } from '@/app/api/exchange/log/route';

const M = listMinistries().find(m => m.status === 'active')!.id;
const url = `http://localhost/api/org/ministries/${M}/queue/feed`;
const ctx = { params: Promise.resolve({ id: M }) };
const call = (headers: Record<string, string>, body = '{"cases":[]}') => casePost(new NextRequest(url, { method: 'POST', headers, body }), ctx);

describe('the exchange log under unauthenticated calls', () => {
  beforeEach(() => { resetExchangeLog(); resetFeedKeys(); resetRateLimits(); });

  it('keeps unknown-key calls out of the log (no receipt, only a bounded count), so real exchanges stay', async () => {
    const r = issueFeed(M, `Guarded feed ${Date.now()}`, 'PS');
    if ('error' in r) throw new Error(r.error);
    const real = await call({ authorization: `Bearer ${r.key}`, 'x-forwarded-for': '10.0.0.1' });
    expect(real.status).toBe(200);
    for (let i = 0; i < 40; i++) {
      const res = await call({ authorization: 'Bearer ccf_nope', 'x-forwarded-for': `10.1.${i}.1` });
      expect(res.status).toBe(401);
      expect(res.headers.get('CivicOS-Receipt')).toBeNull();
      expect((await res.json()).receipt).toBeUndefined();
    }
    expect(listExchanges().map(e => e.feedId)).toEqual([r.feed.id]);
    expect(listUnauthenticated()).toEqual([expect.objectContaining({ channel: 'case-feed', ministryId: M, result: 'unknown key', count: 40 })]);
    const listed = await (await logGet(new NextRequest('http://localhost/api/exchange/log'))).json();
    expect(listed.exchanges).toHaveLength(1);
    expect(listed.unauthenticated[0]).toMatchObject({ count: 40 });
  });

  it('limits calls per address before looking at the key, and per key once known', async () => {
    const burst = POLICIES.feed.burst;
    for (let i = 0; i < burst; i++) expect((await call({ 'x-forwarded-for': '10.2.0.1' })).status).toBe(401);
    const limited = await call({ 'x-forwarded-for': '10.2.0.1' });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBeTruthy();
    expect(listUnauthenticated().find(u => u.result === 'rate limited (address)')).toMatchObject({ count: 1 });

    const r = issueFeed(M, `Busy feed ${Date.now()}`, 'PS');
    if ('error' in r) throw new Error(r.error);
    // The bucket refills while the test runs, so count the admitted calls rather than assume exactly `burst`.
    let admitted = 0, refusedByKey = false;
    for (let i = 0; i < burst * 3 && !refusedByKey; i++) {
      const st = (await call({ authorization: `Bearer ${r.key}`, 'x-forwarded-for': `10.3.${i}.1` })).status;
      if (st === 429) refusedByKey = true; else admitted++;
    }
    expect(refusedByKey).toBe(true);
    expect(admitted).toBeGreaterThanOrEqual(burst);
    expect(listExchanges({ feedId: r.feed.id, limit: 500 })).toHaveLength(admitted);
    expect(listUnauthenticated().find(u => u.result === 'rate limited (key)')).toMatchObject({ feedId: r.feed.id, count: 1 });
  });

  it('refuses a body declared too large before reading it', async () => {
    const r = issueFeed(M, `Large feed ${Date.now()}`, 'PS');
    if ('error' in r) throw new Error(r.error);
    const res = await call({ authorization: `Bearer ${r.key}`, 'content-length': String(50_000_000) }, '{}');
    expect(res.status).toBe(413);
    expect(listExchanges({ feedId: r.feed.id })[0]).toMatchObject({ status: 413 });
    const site = await sitePost(new NextRequest(`http://localhost/api/org/ministries/${M}/facilities/feed`, { method: 'POST', body: '{}' }), ctx);
    expect(site.status).toBe(401);
    expect((await caseGet(new NextRequest(url), ctx)).status).toBe(401);
    expect(listExchanges()).toHaveLength(1);
  });

  it('does not log federation calls without a valid integration key', async () => {
    const res = await federationPost(new NextRequest('http://localhost/api/federation/exchange', { method: 'POST', headers: { authorization: 'Bearer civ_00000000_' + 'A'.repeat(43) }, body: '{}' }));
    expect(res.status).toBe(401);
    expect(listExchanges({ channel: 'federation' })).toHaveLength(0);
    expect(listUnauthenticated()[0]).toMatchObject({ channel: 'federation' });
  });

  it('keeps the unauthenticated summary bounded however many distinct rows arrive', () => {
    for (let i = 0; i < MAX_UNAUTHENTICATED_ROWS + 50; i++) noteUnauthenticated({ channel: 'case-feed', ministryId: `m-${i}`, result: 'unknown key' });
    expect(listUnauthenticated(10_000)).toHaveLength(MAX_UNAUTHENTICATED_ROWS);
  });
});
