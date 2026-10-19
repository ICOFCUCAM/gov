// Resolver for the twin's persistent identifiers (lib/twin/register.ts
// uriPath): https://<nation domain>/id/<kind>/<code> answers 303 See Other
// (the Linked Data convention for a thing, not a document) — to the entity's
// JSON (/api/twin/entities/<id>; NGSI-LD with Accept: application/ld+json)
// when the client asks for JSON, otherwise to its view on National data
// (/gov/twin?entity=<id>). Unknown identifiers are 404. A route handler, not a
// page, so it is not in route-lock.json (which records pages).

import { NextRequest, NextResponse } from 'next/server';
import { getEntity, entityIdFor, syncRegister } from '@/lib/twin/register';

export const dynamic = 'force-dynamic';

const KINDS = new Set(['nation', 'place', 'institution', 'facility']);

export async function GET(req: NextRequest, { params }: { params: { kind: string; code: string } }) {
  if (!KINDS.has(params.kind)) return NextResponse.json({ error: 'No such kind of entity' }, { status: 404 });
  await syncRegister();
  const id = entityIdFor(params.kind, decodeURIComponent(params.code));
  if (!getEntity(id)) return NextResponse.json({ error: 'No such entity' }, { status: 404 });
  const accept = req.headers.get('accept') ?? '';
  const machine = /application\/(ld\+)?json/.test(accept) && !/text\/html/.test(accept);
  const to = machine ? `/api/twin/entities/${encodeURIComponent(id)}` : `/gov/twin?entity=${encodeURIComponent(id)}`;
  return NextResponse.redirect(new URL(to, req.nextUrl.origin), 303);
}
