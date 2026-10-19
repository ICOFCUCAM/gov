// News from a ministry's existing website: RSS 2.0, Atom 1.0 or JSON Feed 1.1,
// reduced to plain text. Only the platform's server fetches feeds (never the
// visitor's browser), only from the ministry's own registered website, within
// size and time limits; markup, scripts and styles never pass through.

import { lookup } from 'node:dns/promises';
import { checkPublicUrl, isPrivateAddress, onSite } from './url-safety';

export interface FeedItem {
  title: string;
  summary: string;
  /** Link to the item on the ministry's website (only http(s) links on that site are kept). */
  url?: string;
  /** ISO date, when the feed gives one. */
  date?: string;
}

export const FEED_LIMITS = { items: 10, title: 200, summary: 320, bytes: 1_000_000, timeoutMs: 8000, redirects: 3 } as const;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (w, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
    }
    return ENTITIES[e.toLowerCase()] ?? w;
  });
}

/** Markup to plain text: CDATA unwrapped, scripts/styles dropped with their content, tags removed, entities decoded, whitespace folded. */
export function plainText(s: string, max: number): string {
  const text = decodeEntities(
    s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<(script|style|iframe|object|svg)[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<[^>]*>/g, ' '),
  )
    // Entity-encoded markup inside RSS descriptions decodes to tags: strip again.
    .replace(/<(script|style)[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

const tag = (xml: string, name: string) => new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(xml)?.[1];
const isoDate = (s: string | undefined) => {
  if (!s) return undefined;
  const d = new Date(plainText(s, 80));
  return Number.isNaN(+d) ? undefined : d.toISOString();
};

function safeLink(raw: string | undefined, website: string): string | undefined {
  if (!raw) return undefined;
  const link = plainText(raw, 2000);
  const c = checkPublicUrl(link);
  return c.ok && onSite(c.url.href, website) ? c.url.href : undefined;
}

/** Parse a feed document into at most FEED_LIMITS.items plain-text items. */
export function parseFeed(body: string, website: string): FeedItem[] {
  const text = body.trim();
  let raw: { title?: string; summary?: string; url?: string; date?: string }[] = [];
  if (text.startsWith('{')) {
    try {
      const j = JSON.parse(text) as { items?: Record<string, unknown>[] };
      raw = (Array.isArray(j.items) ? j.items : []).map(i => ({
        title: typeof i.title === 'string' ? i.title : undefined,
        summary: [i.summary, i.content_text, i.content_html].find(v => typeof v === 'string') as string | undefined,
        url: typeof i.url === 'string' ? i.url : undefined,
        date: typeof i.date_published === 'string' ? i.date_published : typeof i.date_modified === 'string' ? i.date_modified : undefined,
      }));
    } catch { return []; }
  } else if (/<feed[\s>]/i.test(text)) {
    raw = [...text.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)].map(([, e]) => {
      const links = [...e!.matchAll(/<link\b([^>]*)\/?>/gi)].map(m => m[1]!);
      const alt = links.find(l => /rel=["']alternate["']/i.test(l)) ?? links.find(l => !/rel=/i.test(l)) ?? links[0];
      return {
        title: tag(e!, 'title'), summary: tag(e!, 'summary') ?? tag(e!, 'content'),
        url: alt ? /href=["']([^"']+)["']/i.exec(alt)?.[1] : undefined,
        date: tag(e!, 'published') ?? tag(e!, 'updated'),
      };
    });
  } else if (/<rss[\s>]|<rdf:RDF[\s>]|<channel[\s>]/i.test(text)) {
    raw = [...text.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(([, i]) => ({
      title: tag(i!, 'title'), summary: tag(i!, 'description') ?? tag(i!, 'content:encoded'),
      url: tag(i!, 'link') ?? tag(i!, 'guid'), date: tag(i!, 'pubDate') ?? tag(i!, 'dc:date'),
    }));
  }
  return raw
    .map(r => ({
      title: plainText(r.title ?? '', FEED_LIMITS.title),
      summary: plainText(r.summary ?? '', FEED_LIMITS.summary),
      url: safeLink(r.url, website),
      date: isoDate(r.date),
    }))
    .filter(i => i.title)
    .slice(0, FEED_LIMITS.items)
    .map(i => Object.fromEntries(Object.entries(i).filter(([, v]) => v !== undefined)) as unknown as FeedItem);
}

export interface FeedDeps {
  fetch?: typeof fetch;
  /** Resolve a host name to its addresses (DNS by default). */
  resolve?: (host: string) => Promise<string[]>;
}
const dnsResolve = async (host: string) => (await lookup(host, { all: true })).map(a => a.address);

/** Fetch and parse a ministry's feed from the platform's server, within the limits above. */
export async function fetchFeed(feedUrl: string, website: string, deps: FeedDeps = {}): Promise<FeedItem[]> {
  const fetchImpl = deps.fetch ?? fetch;
  const resolve = deps.resolve ?? dnsResolve;
  // Refuse hosts that resolve to private or internal addresses, before every request including redirects.
  const assertPublicHost = async (url: URL) => {
    const addrs = await resolve(url.hostname);
    if (addrs.length === 0 || addrs.some(isPrivateAddress)) throw new Error('The feed address points to a private network');
  };
  let target = feedUrl;
  for (let hop = 0; hop <= FEED_LIMITS.redirects; hop++) {
    const c = checkPublicUrl(target);
    if (!c.ok) throw new Error(c.error);
    if (!onSite(c.url.href, website)) throw new Error('The feed must be on the ministry\'s own website');
    await assertPublicHost(c.url);
    const res = await fetchImpl(c.url.href, {
      redirect: 'manual',
      signal: AbortSignal.timeout(FEED_LIMITS.timeoutMs),
      headers: { accept: 'application/rss+xml, application/atom+xml, application/feed+json, application/json, application/xml;q=0.9, text/xml;q=0.8' },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) throw new Error(`Redirect without a destination (${res.status})`);
      target = new URL(loc, c.url).href;
      continue;
    }
    if (!res.ok) throw new Error(`The website answered ${res.status}`);
    const type = res.headers.get('content-type') ?? '';
    if (type && !/xml|rss|atom|json|text\/plain/i.test(type)) throw new Error(`Not a feed (${type.split(';')[0]})`);
    const body = await readCapped(res, FEED_LIMITS.bytes);
    const items = parseFeed(body, website);
    if (items.length === 0) throw new Error('No news items found in the feed');
    return items;
  }
  throw new Error('Too many redirects');
}

async function readCapped(res: Response, max: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel(); throw new Error('The feed is larger than 1 MB'); }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
