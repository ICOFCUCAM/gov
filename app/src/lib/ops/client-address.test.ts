// Go-live review L-1: the address per-address limits use is the connection's
// own (or the hop the trusted proxies name), never a hop the caller wrote.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import { NextRequest } from 'next/server';
import { clientAddress, trustedProxies, resetRateLimits, POLICIES } from './rate-limit-core';
import { stampPeer, startPeerAddress } from './peer-address';
import { middleware } from '@/middleware';

const h = (xff?: string, real?: string) => new Headers({ ...(xff ? { 'x-forwarded-for': xff } : {}), ...(real ? { 'x-real-ip': real } : {}) });

describe('clientAddress', () => {
  it('takes the right-most hop with no trusted proxy (the connection the server stamped)', () => {
    expect(clientAddress(h('6.6.6.6, 203.0.113.7'), 0)).toBe('203.0.113.7');
    expect(clientAddress(h('203.0.113.7'), 0)).toBe('203.0.113.7');
  });

  it('counts trusted proxies from the right and never trusts hops further left', () => {
    expect(clientAddress(h('6.6.6.6, 203.0.113.7, 10.0.0.2'), 1)).toBe('203.0.113.7');
    expect(clientAddress(h('6.6.6.6, 203.0.113.7, 10.0.0.9, 10.0.0.2'), 2)).toBe('203.0.113.7');
    // Fewer hops than proxies: the left-most (what the proxies in front sent).
    expect(clientAddress(h('203.0.113.7'), 2)).toBe('203.0.113.7');
  });

  it('reads X-Real-IP only behind a trusted proxy', () => {
    expect(clientAddress(h(undefined, '6.6.6.6'), 0)).toBe('unknown');
    expect(clientAddress(h(undefined, '203.0.113.7'), 1)).toBe('203.0.113.7');
  });

  it('reads CIVICOS_TRUSTED_PROXIES (default 0, bounded)', () => {
    expect(trustedProxies({})).toBe(0);
    expect(trustedProxies({ CIVICOS_TRUSTED_PROXIES: '2' })).toBe(2);
    expect(trustedProxies({ CIVICOS_TRUSTED_PROXIES: '-1' })).toBe(0);
    expect(trustedProxies({ CIVICOS_TRUSTED_PROXIES: 'x' })).toBe(0);
    expect(trustedProxies({ CIVICOS_TRUSTED_PROXIES: '99' })).toBe(10);
  });
});

describe('stamping the connection address', () => {
  it('appends the socket address as the last hop', () => {
    const req = { headers: { 'x-forwarded-for': '6.6.6.6' } as http.IncomingHttpHeaders, socket: { remoteAddress: '::ffff:198.51.100.3' } };
    stampPeer(req as never);
    expect(req.headers['x-forwarded-for']).toBe('6.6.6.6, 198.51.100.3');
    const bare = { headers: {} as http.IncomingHttpHeaders, socket: { remoteAddress: '198.51.100.3' } };
    stampPeer(bare as never);
    expect(bare.headers['x-forwarded-for']).toBe('198.51.100.3');
  });

  it('is applied to every request a Node server receives', async () => {
    expect(await startPeerAddress({})).toBe(true);
    const server = http.createServer((req, res) => res.end(String(req.headers['x-forwarded-for'])));
    await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
    try {
      const { port } = server.address() as AddressInfo;
      const seen = await (await fetch(`http://127.0.0.1:${port}/`, { headers: { 'x-forwarded-for': '6.6.6.6' } })).text();
      expect(seen).toBe('6.6.6.6, 127.0.0.1');
      expect(clientAddress(new Headers({ 'x-forwarded-for': seen }), 0)).toBe('127.0.0.1');
    } finally { server.close(); }
  });

  it('stays off on Vercel and when turned off', async () => {
    expect(await startPeerAddress({ VERCEL: '1' })).toBe(false);
    expect(await startPeerAddress({ CIVICOS_PEER_ADDRESS: 'off' })).toBe(false);
  });
});

describe('the middleware limits by the real address', () => {
  beforeEach(() => resetRateLimits());
  afterEach(() => resetRateLimits());

  it('a caller cannot get a fresh bucket by changing the first X-Forwarded-For hop', async () => {
    const send = (spoof: string) => middleware(new NextRequest('http://x/api/ops/incidents', { method: 'POST', headers: { 'x-forwarded-for': `${spoof}, 203.0.113.50` } }));
    const codes: number[] = [];
    for (let i = 0; i <= POLICIES.write.burst; i++) codes.push((await send(`10.9.${i}.1`)).status);
    expect(codes.slice(0, -1).every(c => c !== 429)).toBe(true);
    expect(codes[codes.length - 1]).toBe(429);
  });
});
