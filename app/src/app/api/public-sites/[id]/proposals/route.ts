import { readJson, TOO_LARGE, tooLargeAnswer } from '@/lib/net/body-limit';
import { NextRequest, NextResponse } from 'next/server';
import { proposeSiteChange, proposeRestore, type SiteChange } from '@/lib/data/site-editorial';
import { siteOwner } from '@/lib/data/site-settings';
import { refusal, withOfficial } from '@/lib/auth/official';
import { canActForSite } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

/** Propose a change to a site's content or design (or `restore` an earlier version); a second official publishes it. */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const refused = await refusal(s => canActForSite(s, siteOwner(params.id)));
  if (refused) return refused;
  // A change may carry a logo (150 kB, lib/public-sites/brand.ts) and a site's content: read with a 5 MB cap (review L-4).
  const body = await readJson(req, 5_000_000);
  if (body === TOO_LARGE) return tooLargeAnswer(5_000_000, 'The change');
  const b = (await withOfficial(body && typeof body === 'object' ? body : {})) as { change?: SiteChange; restore?: number; note?: string; by?: string };
  const r = typeof b.restore === 'number'
    ? proposeRestore(params.id, b.restore, b.by ?? '', b.note)
    : proposeSiteChange(params.id, b.change ?? {}, b.by ?? '', b.note);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ proposal: r });
}
