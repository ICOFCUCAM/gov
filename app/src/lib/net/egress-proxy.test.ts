import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import http from 'node:http';
import https from 'node:https';
import net, { type AddressInfo } from 'node:net';
import { pinnedFetch, egressProxy, bypassesProxy, tunnelTarget } from './pinned-fetch';
import { safeFetchText } from './safe-fetch';
import { FEED_CERT_PEM, FEED_KEY_PEM } from './egress.fixture';

// A local forward proxy that only tunnels (CONNECT), as a nation's egress proxy would.
const tunnels: { target?: string; auth?: string }[] = [];
let refuse = false;
const proxy = http.createServer((_req, res) => { res.writeHead(405); res.end(); });
proxy.on('connect', (req: http.IncomingMessage, client: net.Socket, head: Buffer) => {
  tunnels.push({ target: req.url, auth: req.headers['proxy-authorization'] });
  if (refuse) { client.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
  const [host, port] = [req.url!.replace(/:\d+$/, '').replace(/^\[|\]$/g, ''), Number(req.url!.split(':').pop())];
  const up = net.connect(port, host, () => {
    client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    if (head.length) up.write(head);
    up.pipe(client); client.pipe(up);
  });
  up.on('error', () => client.destroy());
});

const seen: { host?: string; servername?: string }[] = [];
const plain = http.createServer((req, res) => { seen.push({ host: req.headers.host }); res.writeHead(200, { 'content-type': 'text/plain' }); res.end(`plain ${req.headers.host}`); });
const secure = https.createServer({ cert: FEED_CERT_PEM, key: FEED_KEY_PEM }, (req, res) => {
  seen.push({ host: req.headers.host, servername: (req.socket as unknown as { servername?: string }).servername });
  res.writeHead(200, { 'content-type': 'text/csv' });
  res.end('a,b\n1,2\n');
});

const listen = (s: net.Server) => new Promise<number>(r => s.listen(0, '127.0.0.1', () => r((s.address() as AddressInfo).port)));
let proxyPort = 0, plainPort = 0, securePort = 0;
beforeAll(async () => { proxyPort = await listen(proxy); plainPort = await listen(plain); securePort = await listen(secure); });
afterAll(() => { proxy.close(); plain.close(); secure.close(); });
afterEach(() => { delete process.env.CIVICOS_EGRESS_PROXY; delete process.env.CIVICOS_EGRESS_NO_PROXY; tunnels.length = 0; seen.length = 0; refuse = false; });

describe('egress proxy for pinned connections', () => {
  it('tunnels to the vetted address, never the name, and keeps the Host header', async () => {
    process.env.CIVICOS_EGRESS_PROXY = `http://civicos:s3cret@127.0.0.1:${proxyPort}`;
    const r = await pinnedFetch(`http://feed.example.gov:${plainPort}/x`, {}, '127.0.0.1');
    expect(await r.text()).toBe(`plain feed.example.gov:${plainPort}`);
    expect(tunnels).toEqual([{ target: `127.0.0.1:${plainPort}`, auth: `Basic ${Buffer.from('civicos:s3cret').toString('base64')}` }]);
  });

  it('speaks TLS to the host name inside the tunnel (SNI and certificate check for the name)', async () => {
    process.env.CIVICOS_EGRESS_PROXY = `http://127.0.0.1:${proxyPort}`;
    const r = await pinnedFetch(`https://feed.example.gov:${securePort}/data.csv`, { ca: FEED_CERT_PEM }, '127.0.0.1');
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('a,b\n1,2\n');
    expect(tunnels[0]!.target).toBe(`127.0.0.1:${securePort}`);
    expect(seen[0]).toEqual({ host: `feed.example.gov:${securePort}`, servername: 'feed.example.gov' });
    // A certificate for another name is refused, as without the proxy.
    await expect(pinnedFetch(`https://other.example.gov:${securePort}/`, { ca: FEED_CERT_PEM }, '127.0.0.1')).rejects.toThrow(/altnames|certificate/i);
  });

  it('safeFetchText keeps the DNS check and pin through the proxy', async () => {
    process.env.CIVICOS_EGRESS_PROXY = `http://127.0.0.1:${proxyPort}`;
    // A resolver answering a private address is refused before any tunnel is asked for.
    await expect(safeFetchText('https://feed.example.gov/x', { allow: () => true, resolve: async () => ['10.0.0.5'] })).rejects.toThrow(/private network/);
    expect(tunnels).toHaveLength(0);
    // A nation's own subscriber on its network (allowPrivate) goes through the tunnel to the address resolved once.
    const r = await safeFetchText(`http://hooks.gov.example:${plainPort}/x`, { allow: () => true, allowPrivate: true, resolve: async () => ['127.0.0.1'] });
    expect(r.text).toBe(`plain hooks.gov.example:${plainPort}`);
    expect(tunnels[0]!.target).toBe(`127.0.0.1:${plainPort}`);
  });

  it('says when the proxy refuses, and goes direct for hosts listed in CIVICOS_EGRESS_NO_PROXY', async () => {
    process.env.CIVICOS_EGRESS_PROXY = `http://127.0.0.1:${proxyPort}`;
    refuse = true;
    await expect(pinnedFetch(`http://feed.example.gov:${plainPort}/x`, {}, '127.0.0.1')).rejects.toThrow(/refused the tunnel \(403\)/);
    process.env.CIVICOS_EGRESS_NO_PROXY = '.example.gov, localhost';
    tunnels.length = 0;
    const r = await pinnedFetch(`http://feed.example.gov:${plainPort}/x`, {}, '127.0.0.1');
    expect(r.status).toBe(200);
    expect(tunnels).toHaveLength(0);
  });

  it('reads its settings', () => {
    expect(egressProxy({} as NodeJS.ProcessEnv)).toBeNull();
    expect(() => egressProxy({ CIVICOS_EGRESS_PROXY: 'socks5://p:1080' } as unknown as NodeJS.ProcessEnv)).toThrow(/http/);
    const p = egressProxy({ CIVICOS_EGRESS_PROXY: 'http://proxy.gov.example:3128', CIVICOS_EGRESS_NO_PROXY: '.gov.example,data.example' } as unknown as NodeJS.ProcessEnv)!;
    expect(bypassesProxy(p, 'stats.gov.example')).toBe(true);
    expect(bypassesProxy(p, 'gov.example')).toBe(true);
    expect(bypassesProxy(p, 'api.data.example')).toBe(true);
    expect(bypassesProxy(p, 'evil-gov.example')).toBe(false);
    expect(tunnelTarget('2001:db8::1', 443)).toBe('[2001:db8::1]:443');
  });
});
