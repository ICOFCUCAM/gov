// Fetching from outside the platform, from the server only, under the same
// rules as the public sites' feeds (lib/public-sites/feed.ts): public http(s)
// addresses only, every host (including each redirect) checked by DNS against
// private and internal networks, a size cap, a time limit, a few redirects and
// an allow rule for where it may go. Used by the twin's source connectors.
//
// The connection goes to the address that was checked (lib/net/pinned-fetch.ts):
// the name is resolved once, every address vetted, and the request is pinned
// to the first one, with the host name kept for Host and TLS (SNI), so a DNS
// answer that changes between the check and the connection (rebinding)
// cannot redirect it to a private network.

import { lookup } from 'node:dns/promises';
import { checkPublicUrl, isPrivateAddress } from '@/lib/public-sites/url-safety';
import { pinnedFetch } from './pinned-fetch';
import { withSpan, SpanKind } from '@/lib/ops/trace';

export interface SafeFetchOptions {
  /** Whether a (redirected) address may be fetched at all, e.g. "the registered source's own host". */
  allow: (url: URL) => boolean;
  accept?: string;
  maxBytes?: number;
  timeoutMs?: number;
  redirects?: number;
  /** Content types accepted (regular expression); anything else is refused. */
  types?: RegExp;
  /** Replaces the pinned connection (tests only: an injected fetch is not pinned). */
  fetch?: typeof fetch;
  resolve?: (host: string) => Promise<string[]>;
  /** POST and other methods (webhook deliveries); redirects are not followed for them. */
  method?: string;
  body?: string;
  headers?: Record<string, string>;
  /** Allow private and internal addresses (a nation's own subscribers on its network); off by default. */
  allowPrivate?: boolean;
}

const dnsResolve = async (host: string) => (await lookup(host, { all: true })).map(a => a.address);

/** An http(s) address without credentials, any host (used only with allowPrivate). */
function anyWebUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return { ok: false, error: 'Not a valid web address' }; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, error: 'Use an http or https address' };
  if (url.username || url.password) return { ok: false, error: 'Addresses with a user name or password are not accepted' };
  url.hash = '';
  return { ok: true, url };
}

/** Fetch under the rules above, in a client span (lib/ops/trace.ts; host and method only, never the query). */
export function safeFetchText(raw: string, o: SafeFetchOptions): Promise<{ text: string; url: string; type: string }> {
  let host = '';
  try { host = new URL(raw).host; } catch { /* refused below */ }
  return withSpan('outbound.fetch', { 'server.address': host, 'http.request.method': o.method ?? 'GET' }, async span => {
    const r = await fetchChecked(raw, o);
    span.setAttribute('http.response.body.size', r.text.length);
    return r;
  }, SpanKind.CLIENT);
}

async function fetchChecked(raw: string, o: SafeFetchOptions): Promise<{ text: string; url: string; type: string }> {
  const resolve = o.resolve ?? dnsResolve;
  const maxBytes = o.maxBytes ?? 5_000_000;
  let target = raw;
  for (let hop = 0; hop <= (o.redirects ?? 3); hop++) {
    const c = o.allowPrivate ? anyWebUrl(target) : checkPublicUrl(target);
    if (!c.ok) throw new Error(c.error);
    if (!o.allow(c.url)) throw new Error(`Not an address this source may fetch: ${c.url.host}`);
    const addrs = await resolve(c.url.hostname);
    if (addrs.length === 0 || (!o.allowPrivate && addrs.some(isPrivateAddress))) throw new Error('The address points to a private network');
    const pinned = addrs[0]!;
    const fetchImpl = o.fetch ?? ((href: string, init: Parameters<typeof pinnedFetch>[1]) => pinnedFetch(href, init, pinned));
    const res = await fetchImpl(c.url.href, { method: o.method ?? 'GET', ...(o.body !== undefined ? { body: o.body } : {}), redirect: 'manual', signal: AbortSignal.timeout(o.timeoutMs ?? 15_000), headers: { accept: o.accept ?? '*/*', ...(o.headers ?? {}) } });
    if (res.status >= 300 && res.status < 400) {
      if ((o.method ?? 'GET') !== 'GET') throw new Error(`The address redirected (${res.status}); deliveries do not follow redirects`);
      const loc = res.headers.get('location');
      if (!loc) throw new Error(`Redirect without a destination (${res.status})`);
      target = new URL(loc, c.url).href;
      continue;
    }
    if (!res.ok) throw new Error(`The source answered ${res.status}`);
    const type = (res.headers.get('content-type') ?? '').split(';')[0]!.trim();
    if (o.types && type && !o.types.test(type)) throw new Error(`Unexpected content type ${type}`);
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) { await reader.cancel(); throw new Error(`The source is larger than ${Math.round(maxBytes / 1_000_000)} MB`); }
        chunks.push(value);
      }
    }
    return { text: new TextDecoder().decode(Buffer.concat(chunks)), url: c.url.href, type };
  }
  throw new Error('Too many redirects');
}
