// The public description of a twin entity (lib/twin/public-entity.ts), where
// /id/<kind>/<code> sends a visitor who is not signed in: JSON-LD
// (schema.org) for machines (Accept: application/ld+json or
// application/json, or ?format=jsonld), a plain HTML page for browsers. Open
// to the public (middleware.ts); a restricted site is refused with 403, an
// unknown identifier 404. A route handler, not a page (not in route-lock.json).

import { NextRequest, NextResponse } from 'next/server';
import { publicEntity, publicEntityHtml } from '@/lib/twin/public-entity';
import { nationLocale } from '@/lib/nation/registry';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ kind: string; code: string }> }) {
  const params = await props.params;
  const p = await publicEntity(params.kind, decodeURIComponent(params.code));
  if (!p.ok) return NextResponse.json({ error: p.error }, { status: p.status });
  const accept = req.headers.get('accept') ?? '';
  const json = req.nextUrl.searchParams.get('format') === 'jsonld' || (/application\/(ld\+)?json/.test(accept) && !/text\/html/.test(accept));
  const headers = { vary: 'Accept', 'cache-control': 'public, max-age=300' };
  if (json) return NextResponse.json(p.doc, { headers: { ...headers, 'content-type': 'application/ld+json; charset=utf-8' } });
  return new NextResponse(publicEntityHtml(p.doc, nationLocale().split('-')[0]), { headers: { ...headers, 'content-type': 'text/html; charset=utf-8' } });
}
