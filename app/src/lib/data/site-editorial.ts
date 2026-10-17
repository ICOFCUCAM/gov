// Publishing a public site's own content (docs/PUBLIC_WEBSITES_PLAN.md,
// decision 10): an official proposes a change to the site's content or
// design; a second, different official publishes it. Every proposal,
// decision and restore is written to the audit chain, and every published
// version is kept so any earlier one can be restored — through the same
// review. Published content is laid over the site's reference record
// (lib/public-sites, siteContent).
//
// Officials are identified by the name they give, as in the Update Center's
// change control (register 11.3). In-memory like the rest of the store (1.1).

import routes from '@/app/route-lock.json';
import { recordAudit } from './store';
import { updateSiteSettings, getSiteSettings } from './site-settings';
import { SITE_IDS } from '@/lib/public-sites';
import type { SiteOverride, SiteSection } from '@/lib/public-sites/types';
import { checkPublicUrl } from '@/lib/public-sites/url-safety';
import { presetsFor } from '@/apps/_shared/public/design/presets';
import { siteContent } from '@/lib/public-sites';
import { translatableStrings, translationProblem, type TranslationEntries } from '@/lib/public-sites/translation';
import { locales } from '@/lib/i18n/config';

export interface SiteChange {
  /** Fields of the site's content; each replaces the published (or reference) field whole. */
  content?: SiteOverride;
  /** A design preset the site may use; null returns to the site's default. */
  preset?: string | null;
  /** Restoring an earlier version: the content replaces the published content entirely. */
  replace?: boolean;
  /** Translations of the site's text into one language (string by string, each with its source). */
  translation?: { locale: string; entries: TranslationEntries };
  /** Restoring: the translations to put back in place of the published ones. */
  translations?: Record<string, TranslationEntries>;
}

export interface SiteProposal {
  id: string;
  siteId: string;
  change: SiteChange;
  /** What the proposal changes, in words. */
  summary: string[];
  note: string;
  proposedBy: string;
  proposedAt: string;
  /** The published version this proposal was made against. */
  basedOn: number;
  status: 'pending' | 'published' | 'rejected' | 'withdrawn';
  decidedBy?: string;
  decidedAt?: string;
  reason?: string;
}

export interface SiteVersion {
  version: number;
  content: SiteOverride;
  preset?: string;
  /** The published translations at this version, by language. */
  translations: Record<string, TranslationEntries>;
  proposalId: string;
  proposedBy: string;
  publishedBy: string;
  at: string;
  note: string;
}

export interface SiteEditorial {
  siteId: string;
  /** 0 = the reference record, nothing published by the nation yet. */
  version: number;
  published?: SiteVersion;
  versions: SiteVersion[];
  proposals: SiteProposal[];
  /** Published translations by language. */
  translations: Record<string, TranslationEntries>;
}

const g = globalThis as unknown as { __civicosEditorial?: Map<string, SiteEditorial> };
const db = (g.__civicosEditorial ??= new Map<string, SiteEditorial>());

export function siteEditorial(siteId: string): SiteEditorial {
  return db.get(siteId) ?? { siteId, version: 0, versions: [], proposals: [], translations: {} };
}

/** The nation's published content for a site, laid over its reference record. */
export function publishedOverride(siteId: string): SiteOverride | undefined {
  return db.get(siteId)?.published?.content;
}

/** The site's published translation into a language. */
export function publishedTranslation(siteId: string, locale: string): TranslationEntries | undefined {
  return db.get(siteId)?.translations[locale];
}

/** A pending proposal's content laid over what is published, for previewing it on the site. */
export function previewOverride(siteId: string, proposalId: string): { content: SiteOverride; preset?: string | null; translations: Record<string, TranslationEntries> } | null {
  const e = db.get(siteId);
  const p = e?.proposals.find(x => x.id === proposalId && x.status === 'pending');
  if (!e || !p) return null;
  const content = p.change.replace ? { ...(p.change.content ?? {}) } : { ...(e.published?.content ?? {}), ...(p.change.content ?? {}) };
  return { content, preset: p.change.preset, translations: nextTranslations(e, p.change) };
}

/** The translations after a change: a restore puts its set back; a translation merges into its language. */
function nextTranslations(e: SiteEditorial, change: SiteChange): Record<string, TranslationEntries> {
  if (change.replace) return { ...(change.translations ?? {}) };
  if (!change.translation) return e.translations;
  const { locale, entries } = change.translation;
  const merged = { ...(e.translations[locale] ?? {}), ...entries };
  for (const [k, v] of Object.entries(merged)) if (!v.target.trim()) delete merged[k];
  return { ...e.translations, [locale]: merged };
}

// ── Validation ───────────────────────────────────────────────────────────

const FIELDS = new Set(['institution', 'nav', 'hero', 'alert', 'quickServices', 'featured', 'statistics', 'statisticsSource', 'news', 'newsSource', 'initiatives', 'locator', 'shortcuts', 'footerSections', 'newsletter', 'legalLine', 'legalLinks']);
const LABEL: Record<string, string> = {
  institution: 'name and tagline', nav: 'menu', hero: 'opening', alert: 'notice', quickServices: 'services', featured: 'featured cards',
  statistics: 'figures', statisticsSource: 'figures source', news: 'news', newsSource: 'news source', initiatives: 'programmes', locator: 'locator',
  shortcuts: 'shortcuts', footerSections: 'footer', newsletter: 'newsletter', legalLine: 'legal line', legalLinks: 'legal links',
};
const SECTIONS = new Set<SiteSection>(['home', 'services', 'statistics', 'news', 'programmes', 'contact', 'about']);
const LOCKED = new Set(routes as string[]);

function checkValue(v: unknown, at: string): string | null {
  if (typeof v === 'string') {
    if (v.length > 600) return `${at} is longer than 600 characters`;
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) return `${at} contains control characters`;
    return null;
  }
  if (typeof v === 'number' || typeof v === 'boolean' || v === null) return null;
  if (Array.isArray(v)) {
    if (v.length > 24) return `${at} has more than 24 entries`;
    for (let i = 0; i < v.length; i++) { const e = checkValue(v[i], `${at}[${i + 1}]`); if (e) return e; }
    return null;
  }
  if (typeof v === 'object') {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (k === 'to') {
        if (typeof x !== 'string' || !(SECTIONS.has(x as SiteSection) || (x.startsWith('/') && LOCKED.has(x.split('#')[0]!)))) return `${at}: "${String(x)}" is not a section of the site or a page on this platform`;
        continue;
      }
      if (k === 'url') {
        if (typeof x !== 'string' || !checkPublicUrl(x).ok) return `${at}: the link must be a public web address`;
        continue;
      }
      const e = checkValue(x, `${at}.${k}`); if (e) return e;
    }
    return null;
  }
  return `${at} has an unsupported value`;
}

/** Problems with a proposed content change, or null. */
export function contentProblems(content: SiteOverride): string | null {
  for (const k of Object.keys(content)) if (!FIELDS.has(k)) return `Unknown field "${k}"`;
  const c = content as Record<string, unknown>;
  if (c.hero) {
    const h = c.hero as { headline?: unknown; subhead?: unknown };
    if (!Array.isArray(h.headline) || h.headline.length !== 2 || h.headline.some(x => typeof x !== 'string')) return 'The opening needs two headline lines';
    if (typeof h.subhead !== 'string') return 'The opening needs a subheading';
  }
  if (c.featured !== undefined && (!Array.isArray(c.featured) || c.featured.length !== 3)) return 'There must be exactly three featured cards';
  if (c.newsSource !== undefined && !['sample', 'nation', 'feed'].includes(c.newsSource as string)) return 'Unknown news source';
  if (c.statisticsSource !== undefined && !['sample', 'nation'].includes(c.statisticsSource as string)) return 'Unknown figures source';
  for (const list of ['news', 'statistics', 'initiatives', 'quickServices']) {
    const v = c[list];
    if (v !== undefined && !Array.isArray(v)) return `${LABEL[list]} must be a list`;
  }
  if (Array.isArray(c.news) && (c.news as { title?: unknown }[]).some(n => typeof n?.title !== 'string' || !n.title.trim())) return 'Every news item needs a title';
  if (Array.isArray(c.statistics) && (c.statistics as { value?: unknown; label?: unknown }[]).some(s => typeof s?.value !== 'string' || typeof s?.label !== 'string' || !s.label.trim())) return 'Every figure needs a value and a label';
  if (Array.isArray(c.initiatives) && (c.initiatives as { title?: unknown }[]).some(i => typeof i?.title !== 'string' || !i.title.trim())) return 'Every programme needs a title';
  return checkValue(content, 'content');
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const uid = () => `SC-${globalThis.crypto.randomUUID().slice(0, 8).toUpperCase()}`;

// ── Workflow ─────────────────────────────────────────────────────────────

export function proposeSiteChange(siteId: string, change: SiteChange, by: string, note = ''): SiteProposal | { error: string } {
  if (!SITE_IDS.includes(siteId)) return { error: `No public site "${siteId}"` };
  if (!by.trim()) return { error: 'Name the official proposing the change' };
  const content = change.content ?? {};
  const problem = contentProblems(content);
  if (problem) return { error: problem };
  if (change.preset !== undefined && change.preset !== null && !presetsFor(siteId).some(p => p.id === change.preset)) return { error: `Design "${change.preset}" is not one this site may use` };
  if (change.translation) {
    const { locale, entries } = change.translation;
    if (locale === 'en' || !locales.some(l => l.code === locale)) return { error: `"${locale}" is not a language the platform can show` };
    const texts = new Map(translatableStrings(siteContent(siteId, publishedOverride(siteId))).map(x => [x.path, x.text]));
    const list = Object.entries(entries ?? {});
    if (list.length === 0 || list.length > 2000) return { error: 'A translation needs between 1 and 2000 strings' };
    for (const [path, en] of list) {
      if (!texts.has(path)) return { error: `"${path}" is not text on this site` };
      if (typeof en?.source !== 'string' || typeof en?.target !== 'string') return { error: `"${path}" needs a source and a target` };
      if (en.source !== texts.get(path)) return { error: `The English text of "${path}" has changed; translate the current text` };
      const problem = en.target.trim() ? translationProblem(en.source, en.target) : null;
      if (problem) return { error: `"${path}": the translation ${problem}` };
    }
  }
  const summary = [
    ...(change.replace ? ['restore an earlier version'] : []),
    ...Object.keys(content).map(k => LABEL[k] ?? k),
    ...(change.preset !== undefined ? [`design → ${change.preset ?? 'default'}`] : []),
    ...(change.translation ? [`translation (${change.translation.locale}, ${Object.keys(change.translation.entries).length} strings)`] : []),
  ];
  if (summary.length === 0) return { error: 'The proposal changes nothing' };
  const e = siteEditorial(siteId);
  const p: SiteProposal = {
    id: uid(), siteId, change: { ...(change.content ? { content } : {}), ...(change.preset !== undefined ? { preset: change.preset } : {}), ...(change.replace ? { replace: true, translations: change.translations ?? {} } : {}), ...(change.translation ? { translation: change.translation } : {}) },
    summary, note: note.trim().slice(0, 600), proposedBy: by.trim(), proposedAt: new Date().toISOString(), basedOn: e.version, status: 'pending',
  };
  db.set(siteId, { ...e, proposals: [p, ...e.proposals] });
  recordAudit(p.proposedBy, 'site.content.propose', `PublicSite:${siteId}/${p.id}`, 'ok', summary.join(', '));
  return p;
}

export function decideProposal(siteId: string, proposalId: string, action: 'publish' | 'reject' | 'withdraw', by: string, reason = ''): SiteEditorial | { error: string } {
  const e = siteEditorial(siteId);
  const p = e.proposals.find(x => x.id === proposalId);
  if (!p) return { error: 'Proposal not found' };
  if (p.status !== 'pending') return { error: `This proposal was already ${p.status}` };
  if (!by.trim()) return { error: 'Name the official deciding' };
  const now = new Date().toISOString();
  const done = (status: SiteProposal['status'], extra: Partial<SiteProposal> = {}) =>
    e.proposals.map(x => (x.id === p.id ? { ...x, status, decidedBy: by.trim(), decidedAt: now, ...extra } : x));

  if (action === 'withdraw') {
    if (!same(by, p.proposedBy)) return { error: 'Only the official who proposed it can withdraw it' };
    const next = { ...e, proposals: done('withdrawn') };
    db.set(siteId, next);
    recordAudit(by.trim(), 'site.content.withdraw', `PublicSite:${siteId}/${p.id}`, 'ok');
    return next;
  }
  if (action === 'reject') {
    if (!reason.trim()) return { error: 'Give a reason for rejecting it' };
    const next = { ...e, proposals: done('rejected', { reason: reason.trim().slice(0, 600) }) };
    db.set(siteId, next);
    recordAudit(by.trim(), 'site.content.reject', `PublicSite:${siteId}/${p.id}`, 'ok', reason.trim());
    return next;
  }
  // Publish: four-eyes, and never over a version the proposer did not see.
  if (same(by, p.proposedBy)) return { error: 'A second official must publish it — not the one who proposed it' };
  if (p.basedOn !== e.version) return { error: `Version ${e.version} was published after this proposal was made; review it against the current content and propose again` };
  if (p.change.preset !== undefined) {
    const r = updateSiteSettings(siteId, { preset: p.change.preset }, by.trim());
    if ('error' in r) return r;
  }
  const content = p.change.replace ? { ...(p.change.content ?? {}) } : { ...(e.published?.content ?? {}), ...(p.change.content ?? {}) };
  const translations = nextTranslations(e, p.change);
  const v: SiteVersion = {
    version: e.version + 1, content, preset: getSiteSettings(siteId).preset, translations, proposalId: p.id,
    proposedBy: p.proposedBy, publishedBy: by.trim(), at: now, note: p.note,
  };
  const next: SiteEditorial = { ...e, version: v.version, published: v, versions: [v, ...e.versions], proposals: done('published'), translations };
  db.set(siteId, next);
  recordAudit(by.trim(), 'site.content.publish', `PublicSite:${siteId}/v${v.version}`, 'ok', `${p.summary.join(', ')} · proposed by ${p.proposedBy}`);
  return next;
}

/** Propose going back to an earlier published version (0 = the reference content); it still needs a second official. */
export function proposeRestore(siteId: string, version: number, by: string, note = ''): SiteProposal | { error: string } {
  const e = siteEditorial(siteId);
  if (version === e.version) return { error: 'That version is already published' };
  const v = version === 0 ? null : e.versions.find(x => x.version === version);
  if (version !== 0 && !v) return { error: 'Version not found' };
  return proposeSiteChange(siteId, { content: v?.content ?? {}, preset: v?.preset ?? null, replace: true, translations: v?.translations ?? {} }, by, note || `Restore version ${version}`);
}

/** Test helper. */
export function resetSiteEditorial(): void {
  db.clear();
}
