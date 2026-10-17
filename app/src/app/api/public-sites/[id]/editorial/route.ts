// The editor's view of a public site: its current content (reference record
// with the nation's published content, placeholders kept), the designs it may
// use, its versions and proposals, its integration settings, and the
// languages it can be translated into (the nation's own first).

import { NextRequest, NextResponse } from 'next/server';
import { SITE_IDS, siteContent } from '@/lib/public-sites';
import { publishedOverride, siteEditorial } from '@/lib/data/site-editorial';
import { getSiteSettings } from '@/lib/data/site-settings';
import { presetsFor, DEFAULT_PRESET } from '@/apps/_shared/public/design/presets';
import { effectiveContent } from '@/lib/public-sites/effective';
import { nationLocale } from '@/lib/nation/registry';
import { locales } from '@/lib/i18n/config';
import { subscriberCounts } from '@/lib/data/site-subscriptions';

export const dynamic = 'force-dynamic';

export function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!SITE_IDS.includes(params.id)) return NextResponse.json({ error: 'No such site' }, { status: 404 });
  return NextResponse.json({
    content: siteContent(params.id, publishedOverride(params.id)),
    presets: presetsFor(params.id).map(p => ({ id: p.id, label: p.label, description: p.description })),
    defaultPreset: DEFAULT_PRESET[params.id] ?? 'civic-standard',
    editorial: siteEditorial(params.id),
    settings: getSiteSettings(params.id),
    languages: locales.filter(l => l.code !== 'en'),
    nationLocale: nationLocale(),
    language: effectiveContent(params.id).language,
    subscribers: subscriberCounts(params.id),
  });
}
