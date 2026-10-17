// A public site's content as JSON, for a ministry in Embed mode to place
// CivicOS services and content on its existing website. Cross-site reads are
// allowed only for that ministry's registered website; links are absolute.

import { NextRequest, NextResponse } from 'next/server';
import { SITE_IDS } from '@/lib/public-sites';
import { effectiveContent } from '@/lib/public-sites/effective';
import { fillDeep, siteTokens } from '@/lib/public-sites/tokens';
import { siteHref } from '@/apps/_shared/public/site-props';
import type { SiteLink } from '@/lib/public-sites/types';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!SITE_IDS.includes(params.id)) return NextResponse.json({ error: 'No such site' }, { status: 404 });
  const { content, settings } = effectiveContent(params.id);
  const c = fillDeep(content, siteTokens(new Date().getFullYear()));
  const origin = new URL(req.url).origin;
  const abs = (to: SiteLink) => new URL(siteHref(params.id, to), origin).href;
  const body = {
    site: params.id,
    url: `${origin}/${params.id}`,
    institution: { name: c.institution.name, tagline: c.institution.tagline, role: c.institution.role },
    services: c.quickServices.map(q => ({ title: q.title, subtitle: q.subtitle, url: abs(q.to) })),
    news: c.news.map(n => ({ ...n, source: c.newsSource })),
    programmes: c.initiatives,
    figures: c.statistics.map(s => ({ ...s, sample: c.statisticsSource === 'sample' })),
  };
  const res = NextResponse.json(body);
  if (settings.mode === 'embed' && settings.website) {
    res.headers.set('Access-Control-Allow-Origin', new URL(settings.website).origin);
    res.headers.set('Vary', 'Origin');
  }
  res.headers.set('Cache-Control', 'public, max-age=300');
  return res;
}
