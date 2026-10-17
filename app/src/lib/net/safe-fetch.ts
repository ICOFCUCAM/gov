// Fetching from outside the platform, from the server only, under the same
// rules as the public sites' feeds (lib/public-sites/feed.ts): public http(s)
// addresses only, every host (including each redirect) checked by DNS against
// private and internal networks, a size cap, a time limit, a few redirects and
// an allow rule for where it may go. Used by the twin's source connectors.

import { lookup } from 'node:dns/promises';
import { checkPublicUrl, isPrivateAddress } from '@/lib/public-sites/url-safety';

export interface SafeFetchOptions {
  /** Whether a (redirected) address may be fetched at all, e.g. "the registered source's own host". */
  allow: (url: URL) => boolean;
  accept?: string;
  maxBytes?: number;
  timeoutMs?: number;
  redirects?: number;
  /** Content types accepted (regular expression); anything else is refused. */
  types?: RegExp;
  fetch?: typeof fetch;
  resolve?: (host: string) => Promise<string[]>;
}

const dnsResolve = async (host: string) => (await lookup(host, { all: true })).map(a => a.address);

export async function safeFetchText(raw: string, o: SafeFetchOptions): Promise<{ text: string; url: string; type: string }> {
  const fetchImpl = o.fetch ?? fetch;
  const resolve = o.resolve ?? dnsResolve;
  const maxBytes = o.maxBytes ?? 5_000_000;
  let target = raw;
  for (let hop = 0; hop <= (o.redirects ?? 3); hop++) {
    const c = checkPublicUrl(target);
    if (!c.ok) throw new Error(c.error);
    if (!o.allow(c.url)) throw new Error(`Not an address this source may fetch: ${c.url.host}`);
    const addrs = await resolve(c.url.hostname);
    if (addrs.length === 0 || addrs.some(isPrivateAddress)) throw new Error('The address points to a private network');
    const res = await fetchImpl(c.url.href, { redirect: 'manual', signal: AbortSignal.timeout(o.timeoutMs ?? 15_000), headers: { accept: o.accept ?? '*/*' } });
    if (res.status >= 300 && res.status < 400) {
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
