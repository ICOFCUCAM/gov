import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { pinnedFetch, pinnedLookup, pinnedRequestOptions } from './pinned-fetch';
import { safeFetchText } from './safe-fetch';

let server: http.Server;
let port = 0;
const seen: { host?: string; method?: string; body: string }[] = [];

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      seen.push({ host: req.headers.host, method: req.method, body });
      if (req.url === '/redirect') { res.writeHead(302, { location: '/plain' }); res.end(); return; }
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end(`hello ${req.headers.host}`);
    });
  });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()));
  port = (server.address() as AddressInfo).port;
});
afterAll(() => new Promise<void>(r => server.close(() => r())));

describe('pinned connections', () => {
  it('connects to the pinned address while keeping the host name (no second DNS lookup)', async () => {
    // "rebind.invalid" cannot resolve through DNS at all: only the pinned address can be reached.
    const res = await pinnedFetch(`http://rebind.invalid:${port}/plain`, { headers: { accept: 'text/plain' } }, '127.0.0.1');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(`hello rebind.invalid:${port}`);
    expect(seen.at(-1)).toMatchObject({ host: `rebind.invalid:${port}`, method: 'GET' });
  });

  it('sends POST bodies and returns redirects unfollowed', async () => {
    const r = await pinnedFetch(`http://hooks.invalid:${port}/redirect`, { method: 'POST', body: '{"a":1}', headers: { 'content-type': 'application/json' } }, '127.0.0.1');
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toBe('/plain');
    expect(seen.at(-1)).toMatchObject({ method: 'POST', body: '{"a":1}' });
  });

  it('keeps the TLS server name (SNI) and Host for https, and answers every lookup with the pinned address', () => {
    const o = pinnedRequestOptions(new URL('https://data.stats.example/api?x=1'), '203.0.113.7');
    expect(o).toMatchObject({ hostname: 'data.stats.example', servername: 'data.stats.example', port: 443, path: '/api?x=1', headers: { host: 'data.stats.example' } });
    const got: unknown[] = [];
    const lookup = pinnedLookup('203.0.113.7');
    (lookup as unknown as (h: string, o: object, cb: (...a: unknown[]) => void) => void)('data.stats.example', {}, (...a) => got.push(a));
    (lookup as unknown as (h: string, o: object, cb: (...a: unknown[]) => void) => void)('data.stats.example', { all: true }, (...a) => got.push(a));
    expect(got).toEqual([[null, '203.0.113.7', 4], [null, [{ address: '203.0.113.7', family: 4 }]]]);
    expect(pinnedLookup('2001:db8::1')).toBeTypeOf('function');
  });

  it('safeFetchText resolves once per hop and connects only to the vetted address', async () => {
    let calls = 0;
    const resolve = async () => { calls++; return ['127.0.0.1']; };
    const r = await safeFetchText(`http://feed.invalid:${port}/redirect`, { allow: () => true, resolve, allowPrivate: true });
    expect(r.text).toBe(`hello feed.invalid:${port}`);
    expect(calls).toBe(2); // the first address and the redirect, each checked once
  });

  it('refuses a private answer before connecting', async () => {
    const before = seen.length;
    await expect(safeFetchText('https://feed.example.gov/data.csv', { allow: () => true, resolve: async () => ['10.0.0.8'] })).rejects.toThrow(/private network/);
    expect(seen.length).toBe(before);
  });
});
