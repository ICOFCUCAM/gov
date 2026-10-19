// Resolver for the twin's persistent identifiers (lib/twin/register.ts
// uriPath): https://<nation domain>/id/<kind>/<code> answers 303 See Other
// (the Linked Data convention for a thing, not a document). For an official
// (a verified session, or the open console when sign-in is not enforced): to
// the entity's JSON (/api/twin/entities/<id>; NGSI-LD with Accept:
// application/ld+json) when the client asks for JSON, otherwise to its view on
// National data (/gov/twin?entity=<id>). For the public, without signing in
// (an open path in middleware.ts): to its public description,
// /id/<kind>/<code>/about (lib/twin/public-entity.ts); a restricted site is
// refused with 403. Unknown identifiers are 404. A route handler, not a page,
// so it is not in route-lock.json (which records pages).

import { NextRequest, NextResponse } from 'next/server';
import { entityIdFor, getEntity, syncRegister } from '@/lib/twin/register';
import { publicEntity, ENTITY_KINDS } from '@/lib/twin/public-entity';
import { currentOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

/** An official reading: a verified session, or (sign-in not enforced) the console's demo session, as the gate lets it through. */
async function insider(req: NextRequest): Promise<boolean> {
  if (await currentOfficial()) return true;
  return process.env.CIVICOS_AUTH !== 'enforce' && !!req.cookies.get('civicos_session')?.value;
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ kind: string; code: string }> }
) {
  const params = await props.params;
  const code = decodeURIComponent(params.code);
  const official = await insider(req);
  const id = entityIdFor(params.kind, code);
  if (official) {
    // Officials resolve every entity of the register, restricted sites included.
    if (!(ENTITY_KINDS as readonly string[]).includes(params.kind)) return NextResponse.json({ error: 'No such kind of entity' }, { status: 404 });
    await syncRegister();
    if (!getEntity(id)) return NextResponse.json({ error: 'No such entity' }, { status: 404 });
  } else {
    const p = await publicEntity(params.kind, code);
    if (!p.ok) return NextResponse.json({ error: p.error }, { status: p.status });
  }
  const accept = req.headers.get('accept') ?? '';
  const machine = /application\/(ld\+)?json/.test(accept) && !/text\/html/.test(accept);
  const to = !official
    ? `/id/${encodeURIComponent(params.kind)}/${encodeURIComponent(code)}/about`
    : machine ? `/api/twin/entities/${encodeURIComponent(id)}` : `/gov/twin?entity=${encodeURIComponent(id)}`;
  return NextResponse.redirect(new URL(to, req.nextUrl.origin), { status: 303, headers: { vary: 'Accept, Cookie' } });
}
