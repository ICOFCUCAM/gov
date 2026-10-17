// What a public site actually shows: its content record (with the nation's
// own content laid over it) plus what its integration settings bring in —
// in Link, Embed and Migrate mode the news comes from the ministry's existing
// website (the last good copy of its feed).

import { siteContent } from './index';
import type { SiteContent } from './types';
import { getSiteSettings, type SiteSettings } from '@/lib/data/site-settings';

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso));

export function effectiveContent(id: string): { content: SiteContent; settings: SiteSettings } {
  const settings = getSiteSettings(id);
  const base = siteContent(id);
  const items = settings.mode !== 'host' ? settings.feed.items : [];
  const content: SiteContent = items.length > 0
    ? { ...base, newsSource: 'feed', news: items.map(i => ({ title: i.title, summary: i.summary, ...(i.date ? { date: dateLabel(i.date) } : {}), ...(i.url ? { url: i.url } : {}) })) }
    : base;
  return { content, settings };
}
