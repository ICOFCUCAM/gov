// Public institution sites: how each relates to the ministry's existing
// website (mode, website, feed, redirects) and which design it wears.
// See lib/data/site-settings.ts and docs/PUBLIC_WEBSITES_PLAN.md.

import { NextResponse } from 'next/server';
import { listSiteSettings } from '@/lib/data/site-settings';
import { REFERENCE_SITES } from '@/lib/public-sites';
import { fillDeep, siteTokens } from '@/lib/public-sites/tokens';

export const dynamic = 'force-dynamic';

export function GET() {
  const tokens = siteTokens(new Date().getFullYear());
  const sites = listSiteSettings().map(s => ({
    ...s,
    name: fillDeep(REFERENCE_SITES[s.siteId]!.institution.name, tokens),
    role: REFERENCE_SITES[s.siteId]!.institution.role,
  }));
  return NextResponse.json({ sites });
}
