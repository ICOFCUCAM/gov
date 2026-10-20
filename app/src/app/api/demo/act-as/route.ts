// Switch to a member of the demo cast (lib/auth/demo-cast.ts):
// POST { accountId } ends the current session and issues one for the cast
// account through the ordinary session code (issueSession()), so everything
// after it is recorded under that account and four-eyes steps still need two
// different accounts. Only an administrator or a member of the cast, signed
// in now, may switch; each switch is written to the audit chain as
// `demo.act-as`, naming the official who switched and the account they now
// act as. A production installation has no cast: 404 (and the middleware
// refuses /api/demo/* there before this runs).

import { NextRequest, NextResponse } from 'next/server';
import { samplesAllowed } from '@/lib/ops/mode';
import { currentOfficial, actorLabel, issueSession, sessionToken, sessionKey } from '@/lib/auth/official';
import { revokeSession } from '@/lib/auth/officials';
import { actAsRefusal, castClaims, isCastSubject } from '@/lib/auth/demo-cast';
import { roleLabel, roleOf } from '@/lib/auth/roles';
import { recordAudit, getMinistry } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!samplesAllowed()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const o = await currentOfficial();
  const why = actAsRefusal(o);
  if (why) {
    if (o) recordAudit(actorLabel(o), 'demo.act-as', `Official:${o.sub}`, 'denied', why);
    return NextResponse.json({ error: why }, { status: o ? 403 : 401 });
  }
  const b = (await req.json().catch(() => ({}))) as { accountId?: unknown };
  const id = typeof b.accountId === 'string' ? b.accountId : '';
  const claims = castClaims(id);
  if ('error' in claims) return NextResponse.json(claims, { status: 404 });
  if (claims.sub === o!.sub) return NextResponse.json({ error: 'You already act as this member of the demo cast' }, { status: 409 });
  const res = await issueSession(NextResponse.json({ official: claims }), claims, req.nextUrl.protocol === 'https:');
  if (res.status !== 200) return res;
  // The session switched from ends on the server, as at sign-out.
  const token = await sessionToken();
  if (token) revokeSession(sessionKey(token), o!.exp);
  const where = claims.institution ? getMinistry(claims.institution)?.name ?? claims.institution : 'whole government';
  recordAudit(actorLabel(o!), 'demo.act-as', `Official:${claims.sub}`, 'ok',
    `${actorLabel(o!)} (${o!.sub}${isCastSubject(o!.sub) ? ', demo cast' : ''}, ${roleLabel(roleOf(o!))}) now acts as ${claims.name} (${claims.sub}, ${roleLabel(claims.role!)} · ${where}) · demo cast, sample`);
  return res;
}
