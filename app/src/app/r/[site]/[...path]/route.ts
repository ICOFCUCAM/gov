// Forwarding for a ministry moving its existing website to CivicOS (Migrate
// mode). The old web server needs one rule — send every request to
//   https://<platform>/r/<site>/<old path>
// — and each address goes to the page it moved to (permanent redirect), or to
// the site's home while its page has not moved yet (temporary redirect, so it
// can be mapped later). Reversible: removing a mapping restores the default.

import { NextResponse } from 'next/server';
import { resolveRedirect } from '@/lib/data/site-settings';

export const dynamic = 'force-dynamic';

export function GET(req: Request, { params }: { params: { site: string; path: string[] } }) {
  const r = resolveRedirect(params.site, (params.path ?? []).join('/'));
  if (!r) return new NextResponse('Not found', { status: 404 });
  return NextResponse.redirect(new URL(r.to, req.url), r.mapped ? 301 : 302);
}
