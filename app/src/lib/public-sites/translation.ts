// Translating a public site's content into the nation's languages.
//
// A translation is kept string by string, each with the source text it was
// made from: { "news.0.title": { source, target } }. It applies only while the
// site's text still equals that source; when the source changes (a ministry
// rewrites an item) the translation is out of date and the source shows until
// it is translated again — never a translation of different words.
//
// Translators work in XLIFF 2.0, the OASIS standard that translation tools
// read (exportXliff / importXliff). Placeholders such as {nation} or
// {emergency.police:999} must survive translation unchanged.

import type { SiteContent } from './types';

export type TranslationEntries = Record<string, { source: string; target: string }>;

// Fields that are not prose: links, colours, glyphs, identifiers and sources.
const SKIP = new Set(['id', 'to', 'color', 'icon', 'crest', 'url', 'tone', 'role', 'pinLabel', 'pinCoords', 'newsSource', 'statisticsSource']);

/** Text worth translating: it has letters outside placeholders. */
const prose = (s: string) => /\p{L}/u.test(s.replace(/\{[^{}]*\}/g, ''));

/** Every translatable string of a site's content, by path ("hero.headline.0", "news.2.title"). */
export function translatableStrings(content: SiteContent): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  const walk = (v: unknown, path: string) => {
    if (typeof v === 'string') { if (prose(v)) out.push({ path, text: v }); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, path ? `${path}.${i}` : String(i))); return; }
    if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) if (!SKIP.has(k)) walk(x, path ? `${path}.${k}` : k);
    }
  };
  walk(content, '');
  return out;
}

/** The content with every up-to-date translation applied. */
export function applyTranslation(content: SiteContent, entries: TranslationEntries | undefined): SiteContent {
  if (!entries || Object.keys(entries).length === 0) return content;
  const copy = JSON.parse(JSON.stringify(content)) as SiteContent;
  for (const { path, text } of translatableStrings(content)) {
    const e = entries[path];
    if (!e || e.source !== text || !e.target.trim()) continue;
    const keys = path.split('.');
    let node: Record<string, unknown> = copy as unknown as Record<string, unknown>;
    for (const k of keys.slice(0, -1)) node = node[k] as Record<string, unknown>;
    node[keys[keys.length - 1]!] = e.target;
  }
  return copy;
}

export interface Coverage {
  total: number;
  translated: number;
  /** Translated once, but the source has changed since. */
  stale: string[];
  missing: string[];
  complete: boolean;
}

export function coverage(content: SiteContent, entries: TranslationEntries | undefined): Coverage {
  const strings = translatableStrings(content);
  const stale: string[] = [], missing: string[] = [];
  let translated = 0;
  for (const { path, text } of strings) {
    const e = entries?.[path];
    if (!e || !e.target.trim()) missing.push(path);
    else if (e.source !== text) stale.push(path);
    else translated++;
  }
  return { total: strings.length, translated, stale, missing, complete: strings.length > 0 && translated === strings.length };
}

const placeholders = (s: string) => (s.match(/\{[^{}]*\}/g) ?? []).sort();

/** Why a translation cannot be used, or null: it must keep the source's placeholders. */
export function translationProblem(source: string, target: string): string | null {
  const a = placeholders(source), b = placeholders(target);
  if (a.join('\u0000') !== b.join('\u0000')) return `must keep the placeholders ${a.join(' ') || '(none)'}${b.length ? ` (found ${b.join(' ')})` : ''}`;
  if (target.length > 600) return 'is longer than 600 characters';
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(target)) return 'contains control characters';
  return null;
}

const SECTION: Record<string, string> = {
  institution: 'Name', nav: 'Menu', hero: 'Opening', alert: 'Notice', quickServices: 'Service', featured: 'Featured card',
  statistics: 'Figure', news: 'News', initiatives: 'Programme', locator: 'Locator', shortcuts: 'Shortcut',
  footerSections: 'Footer', newsletter: 'Newsletter', legalLine: 'Legal line', legalLinks: 'Legal link',
};
/** A readable place for a string: "News 3 · title", "Opening · headline 1". */
export function pathLabel(path: string): string {
  const [head, ...rest] = path.split('.');
  const parts = rest.map(p => (/^\d+$/.test(p) ? String(Number(p) + 1) : p.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()));
  const label = SECTION[head!] ?? head!;
  if (parts.length === 0) return label;
  if (/^\d+$/.test(parts[0]!)) return `${label} ${parts[0]}${parts.length > 1 ? ` · ${parts.slice(1).join(' ')}` : ''}`;
  return `${label} · ${parts.join(' ')}`;
}

// ── XLIFF 2.0 ────────────────────────────────────────────────────────────

const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const xmlUnesc = (s: string) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
  .replace(/&amp;/g, '&');

/** The site's text as an XLIFF 2.0 file for translators, with existing translations filled in. */
export function exportXliff(siteId: string, content: SiteContent, locale: string, entries: TranslationEntries | undefined): string {
  const units = translatableStrings(content).map(({ path, text }) => {
    const e = entries?.[path];
    const current = e && e.source === text && e.target.trim() ? e.target : '';
    return `    <unit id="${xmlEsc(path)}">
      <notes><note category="location">${xmlEsc(pathLabel(path))}</note>${placeholders(text).length ? `<note category="placeholders">Keep unchanged: ${xmlEsc(placeholders(text).join(' '))}</note>` : ''}</notes>
      <segment state="${current ? 'translated' : 'initial'}">
        <source>${xmlEsc(text)}</source>
        <target>${xmlEsc(current)}</target>
      </segment>
    </unit>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="${xmlEsc(locale)}">
  <file id="${xmlEsc(siteId)}" original="/${xmlEsc(siteId)}">
${units.join('\n')}
  </file>
</xliff>
`;
}

export interface XliffImport {
  entries: TranslationEntries;
  imported: number;
  skipped: { id: string; reason: string }[];
}

/** Read a translated XLIFF 2.0 file back, keeping only units that match the site's current text and keep their placeholders. */
export function importXliff(xml: string, content: SiteContent, locale: string): XliffImport | { error: string } {
  if (!/<xliff\b[^>]*version="2\.\d"/.test(xml)) return { error: 'Not an XLIFF 2 file' };
  const trg = /<xliff\b[^>]*trgLang="([^"]+)"/.exec(xml)?.[1];
  if (!trg || trg.split('-')[0]!.toLowerCase() !== locale.split('-')[0]!.toLowerCase()) return { error: `The file is for "${trg ?? '?'}", not "${locale}"` };
  const current = new Map(translatableStrings(content).map(s => [s.path, s.text]));
  const entries: TranslationEntries = {};
  const skipped: { id: string; reason: string }[] = [];
  for (const [, id, body] of xml.matchAll(/<unit\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/unit>/g)) {
    const path = xmlUnesc(id!);
    const source = xmlUnesc(/<source(?:\s[^>]*)?>([\s\S]*?)<\/source>/.exec(body!)?.[1] ?? '');
    const target = xmlUnesc(/<target(?:\s[^>]*)?>([\s\S]*?)<\/target>/.exec(body!)?.[1] ?? '').trim();
    if (!target) continue;
    const now = current.get(path);
    if (now === undefined) { skipped.push({ id: path, reason: 'no longer on the site' }); continue; }
    if (now !== source) { skipped.push({ id: path, reason: 'the English text changed since the file was exported' }); continue; }
    const problem = translationProblem(source, target);
    if (problem) { skipped.push({ id: path, reason: `translation ${problem}` }); continue; }
    entries[path] = { source, target };
  }
  return { entries, imported: Object.keys(entries).length, skipped };
}
