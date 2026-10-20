// The demo cast (lib/auth/demo-cast.ts): officials for showing a
// demonstration or training installation end to end. GET lists the cast,
// grouped by institution, for the header menu's "Switch to…" list (names,
// offices and roles only, never addresses), with whether the viewer may
// switch. POST creates or refreshes the cast from the deployment profile
// (who is responsible for each register): administrators only, audited.
// A production installation has no cast: both answer 404 (and the
// middleware refuses /api/demo/* there before this runs).

import { NextRequest, NextResponse } from 'next/server';
import { samplesAllowed, installationMode } from '@/lib/ops/mode';
import { currentOfficial, actorLabel } from '@/lib/auth/official';
import { roleOf } from '@/lib/auth/roles';
import { castGroups, castInstitutions, refreshCast, actAsRefusal, isCastSubject } from '@/lib/auth/demo-cast';
import { stateWritable, persistenceStatus } from '@/lib/data/persist';

export const dynamic = 'force-dynamic';

const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });

export async function GET() {
  if (!samplesAllowed()) return notFound();
  const o = await currentOfficial();
  return NextResponse.json({
    mode: installationMode(),
    groups: castGroups(),
    institutions: castInstitutions().map(i => ({ id: i.id, name: i.name })),
    viewer: o ? { sub: o.sub, cast: isCastSubject(o.sub), administrator: roleOf(o) === 'administrator' } : null,
    canSwitch: actAsRefusal(o) === null,
  });
}

export async function POST(req: NextRequest) {
  if (!samplesAllowed()) return notFound();
  if (!stateWritable(req.nextUrl.pathname)) return NextResponse.json({ error: `This server cannot save changes just now (${persistenceStatus()?.error ?? 'state not writable'}); nothing was created. Try again shortly.` }, { status: 503 });
  const o = await currentOfficial();
  if (!o) return NextResponse.json({ error: 'Sign in as an administrator to create the demo cast' }, { status: 401 });
  if (roleOf(o) !== 'administrator') return NextResponse.json({ error: 'Only an administrator can create the demo cast' }, { status: 403 });
  const r = refreshCast(actorLabel(o));
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ ...r, groups: castGroups() });
}
