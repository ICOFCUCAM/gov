import { describe, it, expect, beforeEach } from 'vitest';
import { checkPublicUrl, isPrivateAddress, onSite } from './url-safety';
import { parseFeed, fetchFeed, plainText, FEED_LIMITS } from './feed';
import { getSiteSettings, updateSiteSettings, syncSiteFeed, resolveRedirect, resetSiteSettings } from '@/lib/data/site-settings';
import { listAudit } from '@/lib/data/store';

const SITE = 'https://www.health.example.gov';
const publicDns = async () => ['203.0.113.10'];
const respond = (body: string, type = 'application/rss+xml', status = 200, headers: Record<string, string> = {}) =>
  (async () => new Response(body, { status, headers: { 'content-type': type, ...headers } })) as unknown as typeof fetch;

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Ministry</title>
  <item><title>Clinic &amp; lab hours extended</title><link>https://www.health.example.gov/news/1</link>
    <description><![CDATA[<p>Open <b>late</b> on Thursdays.</p><script>alert(1)</script>]]></description><pubDate>Tue, 06 Oct 2026 09:00:00 GMT</pubDate></item>
  <item><title>Measles campaign</title><link>https://evil.example.com/phish</link><description>&lt;img src=x onerror=alert(1)&gt;Free vaccines</description></item>
</channel></rss>`;

describe('address safety', () => {
  it('accepts public websites and refuses internal, private and odd addresses', () => {
    expect(checkPublicUrl('https://www.health.go.ug').ok).toBe(true);
    for (const bad of ['http://localhost/feed', 'https://10.0.0.5/rss', 'https://[::1]/', 'https://192.168.1.2', 'ftp://health.go.ug',
      'https://user:pw@health.go.ug', 'https://health.go.ug:8443/', 'https://intranet', 'https://server.internal/rss', 'javascript:alert(1)']) {
      expect(checkPublicUrl(bad).ok, bad).toBe(false);
    }
  });
  it('recognises private and reserved networks', () => {
    for (const ip of ['10.1.2.3', '127.0.0.1', '169.254.169.254', '172.20.0.1', '192.168.0.9', '100.64.1.1', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1']) expect(isPrivateAddress(ip), ip).toBe(true);
    for (const ip of ['203.0.113.10', '8.8.8.8', '2001:db8::1']) expect(isPrivateAddress(ip), ip).toBe(false);
  });
  it('keeps feeds and links on the ministry\'s own website', () => {
    expect(onSite('https://news.health.example.gov/rss', SITE)).toBe(true);
    expect(onSite('https://health.example.gov/rss', SITE)).toBe(true);
    expect(onSite('https://health.example.gov.evil.com/rss', SITE)).toBe(false);
    expect(onSite('https://example.gov/rss', SITE)).toBe(false);
  });
});

describe('feed parsing', () => {
  it('reads RSS as plain text: no markup, no scripts, no off-site links', () => {
    const items = parseFeed(RSS, SITE);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ title: 'Clinic & lab hours extended', summary: 'Open late on Thursdays.', url: 'https://www.health.example.gov/news/1', date: '2026-10-06T09:00:00.000Z' });
    expect(items[1]!.summary).toBe('Free vaccines');
    expect(items[1]!.url).toBeUndefined();
    expect(JSON.stringify(items)).not.toMatch(/<|script|onerror/);
  });
  it('reads Atom and JSON Feed', () => {
    const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title type="html">Budget &lt;b&gt;2027&lt;/b&gt;</title>
      <link rel="alternate" href="https://health.example.gov/b"/><summary>Tabled today.</summary><updated>2026-10-01T10:00:00Z</updated></entry></feed>`;
    expect(parseFeed(atom, SITE)).toEqual([{ title: 'Budget 2027', summary: 'Tabled today.', url: 'https://health.example.gov/b', date: '2026-10-01T10:00:00.000Z' }]);
    const json = JSON.stringify({ version: 'https://jsonfeed.org/version/1.1', items: [{ title: 'Notice', content_html: '<p>Hi</p>', url: 'https://www.health.example.gov/n', date_published: '2026-10-02T00:00:00Z' }] });
    expect(parseFeed(json, SITE)[0]).toMatchObject({ title: 'Notice', summary: 'Hi', url: 'https://www.health.example.gov/n' });
  });
  it('limits item count and length', () => {
    const many = `<rss><channel>${Array.from({ length: 30 }, (_, i) => `<item><title>${'x'.repeat(500)}${i}</title></item>`).join('')}</channel></rss>`;
    const items = parseFeed(many, SITE);
    expect(items).toHaveLength(FEED_LIMITS.items);
    expect(items[0]!.title.length).toBeLessThanOrEqual(FEED_LIMITS.title);
    expect(plainText('a &#x3C;script&#x3E;x&#x3C;/script&#x3E; b', 50)).toBe('a b');
  });
});

describe('feed fetching', () => {
  it('fetches from the ministry\'s site and refuses private networks, other sites and oversize answers', async () => {
    await expect(fetchFeed(`${SITE}/rss`, SITE, { fetch: respond(RSS), resolve: publicDns })).resolves.toHaveLength(2);
    await expect(fetchFeed(`${SITE}/rss`, SITE, { fetch: respond(RSS), resolve: async () => ['10.0.0.8'] })).rejects.toThrow(/private network/);
    await expect(fetchFeed('https://other.example.org/rss', SITE, { fetch: respond(RSS), resolve: publicDns })).rejects.toThrow(/own website/);
    await expect(fetchFeed(`${SITE}/rss`, SITE, { fetch: respond('x'.repeat(FEED_LIMITS.bytes + 10)), resolve: publicDns })).rejects.toThrow(/larger than 1 MB/);
    await expect(fetchFeed(`${SITE}/rss`, SITE, { fetch: respond('<html>hi</html>', 'text/html'), resolve: publicDns })).rejects.toThrow(/Not a feed/);
  });
  it('re-checks every redirect', async () => {
    const redirect = respond('', 'text/plain', 302, { location: 'http://169.254.169.254/latest' });
    await expect(fetchFeed(`${SITE}/rss`, SITE, { fetch: redirect, resolve: publicDns })).rejects.toThrow(/numeric address|own website/);
  });
});

describe('site settings', () => {
  beforeEach(() => resetSiteSettings());

  it('default to Host, switch to Link when a website is given, and audit every change', () => {
    expect(getSiteSettings('health').mode).toBe('host');
    const s = updateSiteSettings('health', { website: 'https://www.health.example.gov/' }, 'Chief Information Officer');
    expect(s).toMatchObject({ mode: 'link', website: 'https://www.health.example.gov' });
    expect(listAudit().some(a => a.action === 'site.settings' && a.resource === 'PublicSite:health')).toBe(true);
    expect(updateSiteSettings('health', { website: null }, 'CIO')).toMatchObject({ mode: 'host', website: undefined });
  });
  it('refuse unsafe or inconsistent settings without saving anything', () => {
    expect(updateSiteSettings('health', { mode: 'embed' }, 'CIO')).toEqual({ error: expect.stringMatching(/website first/) });
    expect(updateSiteSettings('health', { website: 'http://10.0.0.1' }, 'CIO')).toEqual({ error: expect.stringMatching(/Website/) });
    updateSiteSettings('health', { website: SITE }, 'CIO');
    expect(updateSiteSettings('health', { feedUrl: 'https://elsewhere.example.org/rss' }, 'CIO')).toEqual({ error: expect.stringMatching(/own website/) });
    expect(updateSiteSettings('health', { preset: 'chamber-hansard' }, 'CIO')).toEqual({ error: expect.stringMatching(/not one this site may use/) });
    expect(updateSiteSettings('health', { redirects: [{ from: '/old', to: '/not-a-page' }] }, 'CIO')).toEqual({ error: expect.stringMatching(/not a page/) });
    expect(updateSiteSettings('nowhere', { website: SITE }, 'CIO')).toEqual({ error: expect.stringMatching(/No public site/) });
    expect(updateSiteSettings('health', { website: SITE }, ' ')).toEqual({ error: expect.stringMatching(/Name the official/) });
  });
  it('keep the last good copy of the news when the website is down', async () => {
    updateSiteSettings('health', { website: SITE, feedUrl: `${SITE}/rss` }, 'CIO');
    const ok = await syncSiteFeed('health', 'watchdog', { fetch: respond(RSS), resolve: publicDns });
    expect(ok.feed).toMatchObject({ status: 'ok', items: [{ title: 'Clinic & lab hours extended' }, { title: 'Measles campaign' }] });
    const down = await syncSiteFeed('health', 'watchdog', { fetch: (async () => { throw new Error('connect ETIMEDOUT'); }) as unknown as typeof fetch, resolve: publicDns });
    expect(down.feed.status).toBe('error');
    expect(down.feed.error).toMatch(/ETIMEDOUT/);
    expect(down.feed.items).toHaveLength(2);
    expect(down.feed.lastSuccess).toBe(ok.feed.lastSuccess);
  });
  it('forward a migrating site\'s old addresses to its new pages, and everything else to its home', () => {
    updateSiteSettings('health', { website: SITE, mode: 'migrate', redirects: [{ from: '/services/vaccination', to: '/health#services' }, { from: '/about-us', to: '/health#about' }] }, 'CIO');
    expect(resolveRedirect('health', 'services/vaccination/')).toEqual({ to: '/health#services', mapped: true });
    expect(resolveRedirect('health', 'unknown/page')).toEqual({ to: '/health', mapped: false });
    updateSiteSettings('health', { mode: 'link' }, 'CIO');
    expect(resolveRedirect('health', 'about-us')).toEqual({ to: '/health', mapped: false });
    expect(resolveRedirect('nowhere', 'x')).toBeNull();
  });
});
