import { NextRequest, NextResponse } from 'next/server';
import { getSiteSettings, updateSiteSettings, type SiteSettingsInput } from '@/lib/data/site-settings';
import { SITE_IDS } from '@/lib/public-sites';

export const dynamic = 'force-dynamic';

export function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!SITE_IDS.includes(params.id)) return NextResponse.json({ error: 'No such site' }, { status: 404 });
  return NextResponse.json({ site: getSiteSettings(params.id) });
}

/** Change a site's settings; `by` names the official (written to the audit chain). */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const b = (await req.json().catch(() => ({}))) as SiteSettingsInput & { by?: string };
  const r = updateSiteSettings(params.id, b, b.by ?? '');
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ site: r });
}
