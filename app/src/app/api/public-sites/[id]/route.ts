import { NextRequest, NextResponse } from 'next/server';
import { getSiteSettings, updateSiteSettings, type SiteSettingsInput } from '@/lib/data/site-settings';
import { SITE_IDS } from '@/lib/public-sites';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!SITE_IDS.includes(params.id)) return NextResponse.json({ error: 'No such site' }, { status: 404 });
  return NextResponse.json({ site: getSiteSettings(params.id) });
}

/** Change a site's settings; `by` names the official (written to the audit chain). */
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as SiteSettingsInput & { by?: string };
  const r = updateSiteSettings(params.id, b, b.by ?? '');
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ site: r });
}
