// A fetch whose connection goes to an address already checked (review S7):
// safeFetchText resolves a host and checks every address against private
// networks; a plain fetch would resolve the name again and could be sent
// somewhere else (DNS rebinding). Here the connection's lookup returns the
// vetted address, while the request keeps the host name: the Host header
// and, for https, the TLS server name (SNI) and certificate check are for
// the name, not the address.
//
// Built on node:http / node:https (no extra dependency); answers with a web
// Response so callers read it like fetch.
//
// Egress proxy: where the nation sends all outbound traffic through its own
// proxy (CIVICOS_EGRESS_PROXY, an http:// or https:// proxy address, with
// credentials in it when the proxy asks for them), the connection is a
// CONNECT tunnel through that proxy to the vetted address and port, never
// to the name, so the proxy cannot resolve it differently. Inside the tunnel
// the request is unchanged: TLS to the host name (SNI and certificate check
// for the name) and the Host header. CIVICOS_EGRESS_NO_PROXY lists host
// names or suffixes (".gov.example") reached directly. The proxy's own name
// is resolved normally: it is the nation's infrastructure.

import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import { isIP, type LookupFunction, type Socket } from 'node:net';
import { Readable } from 'node:stream';

/** A lookup that answers every query with the pinned address (both callback forms Node uses). */
export function pinnedLookup(address: string): LookupFunction {
  const family = isIP(address) === 6 ? 6 : 4;
  return ((_host: string, opts: unknown, cb?: unknown) => {
    const callback = (typeof opts === 'function' ? opts : cb) as (err: Error | null, a: string | { address: string; family: number }[], f?: number) => void;
    const all = typeof opts === 'object' && opts !== null && (opts as { all?: boolean }).all;
    if (all) callback(null, [{ address, family }]);
    else callback(null, address, family);
  }) as LookupFunction;
}

/** The request options that pin the connection to `address` for `url`. */
export function pinnedRequestOptions(url: URL, address: string, init: { method?: string; headers?: Record<string, string> } = {}): https.RequestOptions {
  const tls = url.protocol === 'https:';
  return {
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port || (tls ? 443 : 80),
    path: `${url.pathname}${url.search}`,
    method: init.method ?? 'GET',
    headers: { host: url.host, ...(init.headers ?? {}) },
    lookup: pinnedLookup(address),
    ...(tls ? { servername: isIP(url.hostname) ? undefined : url.hostname } : {}),
    agent: false,
  };
}

const NO_BODY = new Set([101, 103, 204, 205, 304]);

export interface EgressProxy { url: URL; noProxy: string[] }

/** The egress proxy from CIVICOS_EGRESS_PROXY (null when unset). */
export function egressProxy(env: NodeJS.ProcessEnv = process.env): EgressProxy | null {
  const raw = env.CIVICOS_EGRESS_PROXY?.trim();
  if (!raw) return null;
  const url = new URL(raw);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('CIVICOS_EGRESS_PROXY must be an http:// or https:// proxy address');
  const noProxy = (env.CIVICOS_EGRESS_NO_PROXY ?? '').split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
  return { url, noProxy };
}

/** Whether a host is reached directly rather than through the proxy. */
export const bypassesProxy = (p: EgressProxy, host: string): boolean => {
  const h = host.toLowerCase();
  return p.noProxy.some(n => n === '*' || h === n.replace(/^\./, '') || (n.startsWith('.') ? h.endsWith(n) : h.endsWith(`.${n}`)));
};

/** The CONNECT target: the vetted address (IPv6 in brackets) and the port. */
export const tunnelTarget = (address: string, port: number | string): string => `${isIP(address) === 6 ? `[${address}]` : address}:${port}`;

/** Open a CONNECT tunnel through the proxy to `address:port`; resolves to the raw socket once the proxy answers 200. */
export function openTunnel(proxy: EgressProxy, address: string, port: number | string, signal?: AbortSignal): Promise<Socket> {
  const target = tunnelTarget(address, port);
  const auth = proxy.url.username ? `Basic ${Buffer.from(`${decodeURIComponent(proxy.url.username)}:${decodeURIComponent(proxy.url.password)}`).toString('base64')}` : undefined;
  const mod = proxy.url.protocol === 'https:' ? https : http;
  return new Promise<Socket>((resolve, reject) => {
    const req = mod.request({
      host: proxy.url.hostname, port: proxy.url.port || (proxy.url.protocol === 'https:' ? 443 : 80),
      method: 'CONNECT', path: target, agent: false,
      headers: { host: target, ...(auth ? { 'proxy-authorization': auth } : {}) },
      ...(signal ? { signal } : {}),
    });
    req.once('connect', (res, socket) => {
      if (res.statusCode === 200) { resolve(socket); return; }
      socket.destroy();
      reject(new Error(`The egress proxy refused the tunnel (${res.statusCode})`));
    });
    req.once('error', reject);
    req.end();
  });
}

export function pinnedFetch(href: string, init: { method?: string; headers?: Record<string, string>; body?: string | Uint8Array; signal?: AbortSignal; ca?: string }, address: string): Promise<Response> {
  const url = new URL(href);
  const proxy = egressProxy();
  if (proxy && !bypassesProxy(proxy, url.hostname)) return tunnelledFetch(url, init, address, proxy);
  const opts = pinnedRequestOptions(url, address, init);
  const mod = url.protocol === 'https:' ? https : http;
  return send(mod, { ...opts, ...(init.ca ? { ca: init.ca } : {}) }, init);
}

/** The same request inside a CONNECT tunnel to the vetted address (TLS to the host name inside it). */
async function tunnelledFetch(url: URL, init: Parameters<typeof pinnedFetch>[1], address: string, proxy: EgressProxy): Promise<Response> {
  const tlsOn = url.protocol === 'https:';
  const port = url.port || (tlsOn ? 443 : 80);
  const raw = await openTunnel(proxy, address, port, init.signal);
  const socket: Socket = tlsOn
    ? tls.connect({ socket: raw, host: url.hostname, ...(isIP(url.hostname) ? {} : { servername: url.hostname }), ALPNProtocols: ['http/1.1'], ...(init.ca ? { ca: init.ca } : {}) })
    : raw;
  const { lookup: _l, servername: _s, protocol: _p, agent: _a, ...opts } = pinnedRequestOptions(url, address, init);
  // Plain http over the tunnel's socket (already TLS for https): the request itself is unchanged.
  // No agent: only then does Node use createConnection (an agent would open its own connection).
  return send(http, { ...opts, protocol: 'http:', agent: undefined, createConnection: () => socket }, init);
}

function send(mod: typeof http | typeof https, opts: https.RequestOptions, init: Parameters<typeof pinnedFetch>[1]): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const req = mod.request({ ...opts, ...(init.signal ? { signal: init.signal } : {}) }, res => {
      const headers = new Headers();
      for (const [k, v] of Object.entries(res.headers)) {
        if (Array.isArray(v)) v.forEach(x => headers.append(k, x));
        else if (v !== undefined) headers.set(k, String(v));
      }
      const status = res.statusCode ?? 502;
      const body = NO_BODY.has(status) || init.method === 'HEAD' ? null : (Readable.toWeb(res) as unknown as ReadableStream<Uint8Array>);
      if (!body) res.resume();
      resolve(new Response(body, { status, statusText: res.statusMessage, headers }));
    });
    req.on('error', reject);
    if (init.body !== undefined) req.write(init.body);
    req.end();
  });
}
