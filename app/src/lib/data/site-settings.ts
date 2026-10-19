// How each public institution site relates to the ministry's existing website
// (docs/PUBLIC_WEBSITES_PLAN.md, decision 7), and which design preset it wears.
//
//   link     (default when a website is given) — the existing site stays
//            primary; the CivicOS site is its gateway and shows its news.
//   embed    — the existing site places CivicOS services and content on its
//            own pages (/embed/<site>/services, /api/public-sites/<site>/content).
//   migrate  — pages move to CivicOS one at a time; the old server forwards
//            /r/<site>/<old path> to the new page from the redirect map.
//   host     (default when there is no website) — the CivicOS site is the site.
//
// Every institution keeps its full CivicOS site in every mode. Every change is
// written to the audit chain; feeds keep their last good copy when the
// ministry's website is unreachable. In-memory like the rest of the store
// (register 1.1).

import { brandProblem, type SiteBrand } from '@/lib/public-sites/brand';
import routes from '@/app/route-lock.json';
import { recordAudit } from '@/lib/data/store/audit';
import { SITE_IDS } from '@/lib/public-sites';
import { checkPublicUrl, onSite } from '@/lib/public-sites/url-safety';
import { fetchFeed, type FeedItem, type FeedDeps } from '@/lib/public-sites/feed';
import { presetsFor } from '@/apps/_shared/public/design/presets';
import { tracked } from '@/lib/data/repo/track';
import { listMinistries } from '@/lib/data/store/ministries';
import { STANDING_CHARTERS } from '@/lib/institution/charters';

/**
 * The institution that owns a public site (review M-2): the registered
 * ministry whose slug is the site's id (a merged one's successor), else the
 * standing charter (branch or agency) the site belongs to. Undefined for a
 * site no institution owns (it is changed by the whole government only).
 * Read at use, so a ministry created, renamed or merged in the registry
 * applies at once. lib/auth/roles.ts canActForSite() decides with it.
 */
export function siteOwner(siteId: string): string | undefined {
  const m = listMinistries().find(x => x.slug === siteId);
  if (m) return m.status === 'merged' && m.mergedIntoId ? m.mergedIntoId : m.id;
  return STANDING_CHARTERS.find(c => c.id === siteId || c.domain === siteId)?.id;
}

export type SiteMode = 'link' | 'embed' | 'migrate' | 'host';
export const SITE_MODES: SiteMode[] = ['link', 'embed', 'migrate', 'host'];

export interface SiteFeedState {
  status: 'never' | 'ok' | 'error';
  lastAttempt?: string;
  lastSuccess?: string;
  error?: string;
  /** The last good copy: kept when a later fetch fails. */
  items: FeedItem[];
}

export interface SiteRedirect { from: string; to: string; since: string; by: string }

export interface SiteSettings {
  siteId: string;
  website?: string;
  mode: SiteMode;
  feedUrl?: string;
  /** The design preset chosen for this site (one its sector allows); the site's default when unset. */
  preset?: string;
  /** The ministry's own colours and logo (published through the Site editor only, see setSiteBrand). */
  brand?: SiteBrand;
  redirects: SiteRedirect[];
  feed: SiteFeedState;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SiteSettingsInput {
  website?: string | null;
  mode?: SiteMode;
  feedUrl?: string | null;
  preset?: string | null;
  redirects?: { from: string; to: string }[];
}

const g = globalThis as unknown as { __civicosSites?: Map<string, SiteSettings> };
// Held at module level: wrapped so every use is noted (lib/data/repo/track.ts).
const db = tracked('__civicosSites', g.__civicosSites ??= new Map<string, SiteSettings>());

const fresh = (siteId: string): SiteSettings => ({ siteId, mode: 'host', redirects: [], feed: { status: 'never', items: [] } });

export function getSiteSettings(siteId: string): SiteSettings {
  return db.get(siteId) ?? fresh(siteId);
}
export function listSiteSettings(): SiteSettings[] {
  return SITE_IDS.map(getSiteSettings);
}

const LOCKED = new Set(routes as string[]);
const destinationOk = (to: string) => to.startsWith('/') && !to.includes('..') && LOCKED.has(to.split('#')[0]!);

/**
 * Set the ministry's colours and logo. Only the Site editor calls this, when a
 * second official publishes a proposal (four-eyes); null removes the brand.
 */
export function setSiteBrand(siteId: string, brand: SiteBrand | null, by: string): SiteSettings | { error: string } {
  if (!SITE_IDS.includes(siteId)) return { error: `No public site "${siteId}"` };
  const problem = brand ? brandProblem(brand) : null;
  if (problem) return { error: problem };
  const cur = getSiteSettings(siteId);
  const next: SiteSettings = { ...cur, brand: brand && Object.keys(brand).length ? brand : undefined, updatedAt: new Date().toISOString(), updatedBy: by };
  db.set(siteId, next);
  const what = brand ? [brand.primary && `colour ${brand.primary}`, brand.accent && `second colour ${brand.accent}`, brand.logo && `logo (${brand.logo.type}, ${Math.round(brand.logo.data.length * 0.75 / 1024)} KB)`].filter(Boolean).join(' · ') : 'brand removed';
  recordAudit(by, 'site.brand', `PublicSite:${siteId}`, 'ok', what || 'brand removed');
  return next;
}

/** Change a site's settings. Returns the new settings or the first problem found; nothing is saved on error. */
export function updateSiteSettings(siteId: string, input: SiteSettingsInput, by: string): SiteSettings | { error: string } {
  if (!SITE_IDS.includes(siteId)) return { error: `No public site "${siteId}"` };
  if (!by.trim()) return { error: 'Name the official making the change' };
  const cur = getSiteSettings(siteId);
  const next: SiteSettings = { ...cur, redirects: [...cur.redirects], feed: { ...cur.feed, items: [...cur.feed.items] } };
  const changes: string[] = [];

  if (input.website !== undefined) {
    if (input.website === null || input.website.trim() === '') {
      if (cur.website) changes.push('website removed');
      next.website = undefined; next.feedUrl = undefined; next.mode = 'host'; next.feed = { status: 'never', items: [] };
    } else {
      const c = checkPublicUrl(input.website);
      if (!c.ok) return { error: `Website: ${c.error}` };
      const href = c.url.href.replace(/\/$/, '');
      if (href !== cur.website) {
        changes.push(`website ${href}`);
        next.website = href;
        if (!cur.website) next.mode = 'link';
        if (cur.feedUrl && !onSite(cur.feedUrl, href)) { next.feedUrl = undefined; next.feed = { status: 'never', items: [] }; }
      }
    }
  }
  if (input.mode !== undefined) {
    if (!SITE_MODES.includes(input.mode)) return { error: 'Unknown mode' };
    if (input.mode !== 'host' && !next.website) return { error: 'Give the ministry\'s existing website first' };
    if (input.mode !== next.mode) changes.push(`mode ${next.mode} → ${input.mode}`);
    next.mode = input.mode;
  }
  if (input.feedUrl !== undefined) {
    if (input.feedUrl === null || input.feedUrl.trim() === '') {
      if (next.feedUrl) changes.push('feed removed');
      next.feedUrl = undefined; next.feed = { status: 'never', items: [] };
    } else {
      if (!next.website) return { error: 'Give the ministry\'s existing website first' };
      const c = checkPublicUrl(input.feedUrl);
      if (!c.ok) return { error: `Feed: ${c.error}` };
      if (!onSite(c.url.href, next.website)) return { error: 'The feed must be on the ministry\'s own website' };
      if (c.url.href !== next.feedUrl) { changes.push(`feed ${c.url.href}`); next.feedUrl = c.url.href; next.feed = { status: 'never', items: [] }; }
    }
  }
  if (input.preset !== undefined) {
    if (input.preset === null || input.preset === '') next.preset = undefined;
    else if (!presetsFor(siteId).some(p => p.id === input.preset)) return { error: `Design "${input.preset}" is not one this site may use` };
    else next.preset = input.preset;
    if (next.preset !== cur.preset) changes.push(`design ${next.preset ?? 'default'}`);
  }
  if (input.redirects !== undefined) {
    const seen = new Set<string>();
    const list: SiteRedirect[] = [];
    for (const r of input.redirects) {
      const from = r.from.trim(), to = r.to.trim();
      if (!/^\/[^\s?#]*$/.test(from) || from.includes('..') || from.length > 300) return { error: `Old address "${from}" must be a path such as /services/passports` };
      if (seen.has(from)) return { error: `"${from}" appears twice` };
      if (!destinationOk(to)) return { error: `"${to}" is not a page on this platform` };
      seen.add(from);
      const kept = cur.redirects.find(x => x.from === from && x.to === to);
      list.push(kept ?? { from, to, since: new Date().toISOString(), by });
    }
    if (JSON.stringify(list.map(r => [r.from, r.to])) !== JSON.stringify(cur.redirects.map(r => [r.from, r.to]))) changes.push(`${list.length} redirects`);
    next.redirects = list;
  }

  if (changes.length === 0) return cur;
  next.updatedAt = new Date().toISOString();
  next.updatedBy = by;
  db.set(siteId, next);
  recordAudit(by, 'site.settings', `PublicSite:${siteId}`, 'ok', changes.join(' · '));
  return next;
}

/** Fetch the site's feed now. A failure keeps the last good copy and records the error. */
export async function syncSiteFeed(siteId: string, by: string, deps?: FeedDeps): Promise<SiteSettings> {
  const cur = getSiteSettings(siteId);
  if (!cur.website || !cur.feedUrl || cur.mode === 'host') return cur;
  const now = new Date().toISOString();
  try {
    const items = await fetchFeed(cur.feedUrl, cur.website, deps);
    const next = { ...cur, feed: { status: 'ok' as const, lastAttempt: now, lastSuccess: now, items } };
    db.set(siteId, next);
    recordAudit(by, 'site.feed.sync', `PublicSite:${siteId}`, 'ok', `${items.length} items`);
    return next;
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Fetch failed';
    const next = { ...cur, feed: { ...cur.feed, status: 'error' as const, lastAttempt: now, error } };
    db.set(siteId, next);
    recordAudit(by, 'site.feed.sync', `PublicSite:${siteId}`, 'error', error);
    return next;
  }
}

/** Refresh every site that has a feed (the scheduled job). */
export async function syncAllFeeds(by: string, deps?: FeedDeps): Promise<{ siteId: string; status: SiteFeedState['status']; error?: string }[]> {
  const due = listSiteSettings().filter(s => s.website && s.feedUrl && s.mode !== 'host');
  const out = [];
  for (const s of due) {
    const r = await syncSiteFeed(s.siteId, by, deps);
    out.push({ siteId: s.siteId, status: r.feed.status, ...(r.feed.error && r.feed.status === 'error' ? { error: r.feed.error } : {}) });
  }
  return out;
}

/** Where an old address of a migrating site now lives: its mapped page, else the site's home. */
export function resolveRedirect(siteId: string, oldPath: string): { to: string; mapped: boolean } | null {
  if (!SITE_IDS.includes(siteId)) return null;
  const s = getSiteSettings(siteId);
  const path = `/${oldPath.replace(/^\/+/, '')}`.replace(/\/+$/, '') || '/';
  const hit = s.mode === 'migrate' ? s.redirects.find(r => r.from.replace(/\/+$/, '') === path || (r.from === '/' && path === '/')) : undefined;
  return hit ? { to: hit.to, mapped: true } : { to: `/${siteId}`, mapped: false };
}

/** Test helper: forget every site's settings. */
export function resetSiteSettings(): void {
  db.clear();
}
