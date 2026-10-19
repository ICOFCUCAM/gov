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

import http from 'node:http';
import https from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
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

export function pinnedFetch(href: string, init: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }, address: string): Promise<Response> {
  const url = new URL(href);
  const opts = pinnedRequestOptions(url, address, init);
  const mod = url.protocol === 'https:' ? https : http;
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
