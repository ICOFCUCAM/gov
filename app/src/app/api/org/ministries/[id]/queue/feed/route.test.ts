import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from './route';
import { issueFeed } from '@/lib/data/case-import';
import { listMinistries } from '@/lib/data/store';

const M = listMinistries().find(m => m.status === 'active')!.id;
const url = `http://localhost/api/org/ministries/${M}/queue/feed`;
const ctx = { params: Promise.resolve({ id: M }) };

describe('the case feed endpoint', () => {
  it('answers only a connected system\'s key', async () => {
    expect((await POST(new NextRequest(url, { method: 'POST', body: '{"cases":[]}' }), ctx)).status).toBe(401);
    const r = issueFeed(M, `Route test ${Date.now()}`, 'PS');
    if ('error' in r) throw new Error(r.error);
    const auth = { authorization: `Bearer ${r.key}` };
    expect((await POST(new NextRequest(url, { method: 'POST', headers: auth, body: 'not json' }), ctx)).status).toBe(400);
    const ok = await POST(new NextRequest(url, { method: 'POST', headers: auth, body: JSON.stringify({ cases: [{ reference: `RT-${Date.now()}`, subject: 'Route test', received: '2026-10-01' }] }) }), ctx);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ added: 1, refused: [] });
    expect((await GET(new NextRequest(`${url}?since=yesterday`, { headers: auth }), ctx)).status).toBe(422);
    expect((await GET(new NextRequest(url, { headers: auth }), ctx)).status).toBe(200);
  });
});
