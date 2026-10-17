// The editor's view of a public site: its current content (reference record
// with the nation's published content, placeholders kept), the designs it may
// use, its versions and proposals, and its integration settings.

import { NextRequest, NextResponse } from 'next/server';
import { SITE_IDS, siteContent } from '@/lib/public-sites';
import { publishedOverride, siteEditorial } from '@/lib/data/site-editorial';
import { getSiteSettings } from '@/lib/data/site-settings';
import { presetsFor, DEFAULT_PRESET } from '@/apps/_shared/public/design/presets';

export const dynamic = 'force-dynamic';

export function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!SITE_IDS.includes(params.id)) return NextResponse.json({ error: 'No such site' }, { status: 404 });
  return NextResponse.json({
    content: siteContent(params.id, publishedOverride(params.id)),
    presets: presetsFor(params.id).map(p => ({ id: p.id, label: p.label, description: p.description })),
    defaultPreset: DEFAULT_PRESET[params.id] ?? 'civic-standard',
    editorial: siteEditorial(params.id),
    settings: getSiteSettings(params.id),
  });
}
