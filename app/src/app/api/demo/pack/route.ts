// The demo data pack (lib/casework/demo-pack.ts): the demo cast, the sample
// acts and procedures, and one sample case per approved procedure, in one
// step. Administrators only, demo and training installations only: a
// production installation answers 404 (and the middleware refuses /api/demo/*
// there before this runs).

import { NextRequest, NextResponse } from 'next/server';
import { samplesAllowed } from '@/lib/ops/mode';
import { currentOfficial, actorLabel } from '@/lib/auth/official';
import { roleOf } from '@/lib/auth/roles';
import { stateWritable, persistenceStatus } from '@/lib/data/persist';
import { loadDemoPack } from '@/lib/casework/demo-pack';
import '@/lib/casework/modules';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!samplesAllowed()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!stateWritable(req.nextUrl.pathname)) return NextResponse.json({ error: `This server cannot save changes just now (${persistenceStatus()?.error ?? 'state not writable'}); nothing was loaded. Try again shortly.` }, { status: 503 });
  const o = await currentOfficial();
  if (!o) return NextResponse.json({ error: 'Sign in as an administrator to load the demo data pack' }, { status: 401 });
  if (roleOf(o) !== 'administrator') return NextResponse.json({ error: 'Only an administrator can load the demo data pack' }, { status: 403 });
  const r = loadDemoPack(actorLabel(o));
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json(r);
}
