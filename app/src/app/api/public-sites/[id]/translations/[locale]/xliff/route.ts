// XLIFF 2.0 for a site's translators: download the site's text (with the
// published translation filled in), and upload the translated file back. An
// upload is only read and checked here — it becomes a proposal in the editor,
// which a second official publishes.

import { NextRequest, NextResponse } from 'next/server';
import { SITE_IDS, siteContent } from '@/lib/public-sites';
import { publishedOverride, publishedTranslation } from '@/lib/data/site-editorial';
import { exportXliff, importXliff } from '@/lib/public-sites/translation';
import { locales } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';

const known = (id: string, locale: string) => SITE_IDS.includes(id) && locale !== 'en' && locales.some(l => l.code === locale);

export async function GET(_: NextRequest, props: { params: Promise<{ id: string; locale: string }> }) {
  const params = await props.params;
  if (!known(params.id, params.locale)) return NextResponse.json({ error: 'Unknown site or language' }, { status: 404 });
  const xml = exportXliff(params.id, siteContent(params.id, publishedOverride(params.id)), params.locale, publishedTranslation(params.id, params.locale));
  return new NextResponse(xml, {
    headers: {
      'content-type': 'application/xliff+xml; charset=utf-8',
      'content-disposition': `attachment; filename="${params.id}.${params.locale}.xlf"`,
    },
  });
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string; locale: string }> }
) {
  const params = await props.params;
  if (!known(params.id, params.locale)) return NextResponse.json({ error: 'Unknown site or language' }, { status: 404 });
  const xml = await req.text();
  if (xml.length > 2_000_000) return NextResponse.json({ error: 'The file is larger than 2 MB' }, { status: 413 });
  const r = importXliff(xml, siteContent(params.id, publishedOverride(params.id)), params.locale);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json(r);
}
