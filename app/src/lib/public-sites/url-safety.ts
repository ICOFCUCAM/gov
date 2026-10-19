// Checks for the addresses of ministries' existing websites and their news
// feeds. The platform fetches feeds from its own servers, so an address must
// never let it reach anything but a public website: no internal hosts, no
// private or loopback networks, no credentials, no unusual ports — and a feed
// must live on the ministry's own registered website.

export type UrlCheck = { ok: true; url: URL } | { ok: false; error: string };

/** True for loopback, private, link-local, carrier-grade NAT, multicast and reserved addresses. */
export function isPrivateAddress(ip: string): boolean {
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip.replace(/^::ffff:/i, ''));
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 192 && b === 0)
      || (a === 198 && (b === 18 || b === 19));
  }
  const v6 = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (!v6.includes(':')) return false;
  return v6 === '::' || v6 === '::1' || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || /^ff/.test(v6);
}

/** A public http(s) address on a named host, default port, without credentials. */
export function checkPublicUrl(raw: string): UrlCheck {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return { ok: false, error: 'Not a valid web address' }; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, error: 'Use an http or https address' };
  if (url.username || url.password) return { ok: false, error: 'Addresses with a user name or password are not accepted' };
  if (url.port) return { ok: false, error: 'Use the standard web port (no :port in the address)' };
  const host = url.hostname.toLowerCase();
  if (/^\[?[0-9a-f:.]+\]?$/i.test(host) && (host.includes(':') || /^\d+\.\d+\.\d+\.\d+$/.test(host))) {
    return { ok: false, error: 'Use the website\'s name, not a numeric address' };
  }
  if (!host.includes('.') || host === 'localhost' || /\.(localhost|local|internal|lan|home|corp|intranet)$/.test(host)) {
    return { ok: false, error: 'Use a public website address' };
  }
  url.hash = '';
  return { ok: true, url };
}

/** The website's host without a leading "www.", which its feeds and links may sit under. */
export function siteBase(website: string): string {
  return new URL(website).hostname.toLowerCase().replace(/^www\./, '');
}

/** True when `candidate` is on the ministry's website: the same host or one of its subdomains. */
export function onSite(candidate: string, website: string): boolean {
  try {
    const host = new URL(candidate).hostname.toLowerCase();
    const base = siteBase(website);
    return host === base || host.endsWith(`.${base}`) || host === `www.${base}`;
  } catch { return false; }
}
