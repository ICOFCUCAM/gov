// What a public site actually shows: its content record (with the nation's
// own content laid over it) plus what its integration settings bring in —
// in Link, Embed and Migrate mode the news comes from the ministry's existing
// website (the last good copy of its feed): the existing website owns the news.
// With `preview`, a pending proposal is shown in place of what is published.

import { siteContent } from './index';
import type { SiteContent } from './types';
import type { SiteBrand } from './brand';
import { getSiteSettings, type SiteSettings } from '@/lib/data/site-settings';
import { publishedOverride, previewOverride, publishedTranslation } from '@/lib/data/site-editorial';
import { applyTranslation, coverage, type Coverage } from './translation';
import { nationLocale, nationLanguages } from '@/lib/nation/registry';
import { isRTL } from '@/lib/i18n/config';
import type { Locale } from '@/lib/types';

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso));

export interface SiteLanguage {
  /** The nation's language, which the site is translated into. */
  locale: string;
  coverage: Coverage;
  /** The page's language: the nation's once most of its text is translated, else English. */
  lang: string;
  /** Right to left only when every string is translated into a right-to-left language. */
  dir: 'ltr' | 'rtl';
}

export function effectiveContent(id: string, preview?: string, requested?: string): { content: SiteContent; settings: SiteSettings; previewing: boolean; previewPreset?: string | null; previewBrand?: SiteBrand | null; language: SiteLanguage } {
  const settings = getSiteSettings(id);
  const p = preview ? previewOverride(id, preview) : null;
  const source = siteContent(id, p ? p.content : publishedOverride(id));
  // The visitor's choice among the nation's official languages, else the nation's main language:
  // its published translation (or the previewed one) applied string by string.
  const locale = requested && nationLanguages().includes(requested) ? requested : nationLocale();
  const entries = locale === 'en' ? undefined : p ? p.translations[locale] : publishedTranslation(id, locale);
  const cov = coverage(source, entries);
  const base = applyTranslation(source, entries);
  const language: SiteLanguage = locale === 'en'
    ? { locale, coverage: cov, lang: 'en', dir: 'ltr' }
    : { locale, coverage: cov, lang: cov.translated * 2 > cov.total ? locale : 'en', dir: cov.complete && isRTL(locale as Locale) ? 'rtl' : 'ltr' };
  const items = settings.mode !== 'host' ? settings.feed.items : [];
  const content: SiteContent = items.length > 0
    ? { ...base, newsSource: 'feed', news: items.map(i => ({ title: i.title, summary: i.summary, ...(i.date ? { date: dateLabel(i.date) } : {}), ...(i.url ? { url: i.url } : {}) })) }
    : base;
  return { content, settings, previewing: !!p, language, ...(p && p.preset !== undefined ? { previewPreset: p.preset } : {}), ...(p && p.brand !== undefined ? { previewBrand: p.brand } : {}) };
}
