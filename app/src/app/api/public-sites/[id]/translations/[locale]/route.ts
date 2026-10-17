// A site's text for translation into one language: every translatable string
// with its English source, the published translation and its status
// (translated, out of date, missing), and the coverage.

import { NextRequest, NextResponse } from 'next/server';
import { SITE_IDS, siteContent } from '@/lib/public-sites';
import { publishedOverride, publishedTranslation } from '@/lib/data/site-editorial';
import { translatableStrings, coverage, pathLabel } from '@/lib/public-sites/translation';
import { locales } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';

export function GET(_: NextRequest, { params }: { params: { id: string; locale: string } }) {
  if (!SITE_IDS.includes(params.id)) return NextResponse.json({ error: 'No such site' }, { status: 404 });
  if (params.locale === 'en' || !locales.some(l => l.code === params.locale)) return NextResponse.json({ error: 'Unknown language' }, { status: 404 });
  const content = siteContent(params.id, publishedOverride(params.id));
  const entries = publishedTranslation(params.id, params.locale) ?? {};
  const strings = translatableStrings(content).map(({ path, text }) => {
    const e = entries[path];
    const status = !e || !e.target.trim() ? 'missing' : e.source === text ? 'translated' : 'stale';
    return { path, label: pathLabel(path), source: text, target: e?.target ?? '', status, ...(status === 'stale' ? { previousSource: e!.source } : {}) };
  });
  return NextResponse.json({ locale: params.locale, strings, coverage: coverage(content, entries) });
}
