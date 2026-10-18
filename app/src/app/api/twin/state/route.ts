// What the twin knew at a moment (?asOf=ISO time, default now): the latest
// value of each entity's metric recorded by then and true by then, with its
// source and run (lineage). ?knownAt= separates the two: true by asOf, as
// recorded by knownAt (e.g. knownAt=now for "true then, as known today").
// Filter with ?metric= and ?entity=.

import { NextRequest, NextResponse } from 'next/server';
import { stateAsOf, nationalTotal, syncRegister } from '@/lib/twin/register';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await syncRegister();
  const q = req.nextUrl.searchParams;
  const asOf = q.get('asOf') ?? undefined;
  if (asOf && !Number.isFinite(Date.parse(asOf))) return NextResponse.json({ error: 'asOf must be a date or time' }, { status: 400 });
  const metric = q.get('metric') ?? undefined;
  const knownAt = q.get('knownAt') ?? undefined;
  if (knownAt && !Number.isFinite(Date.parse(knownAt))) return NextResponse.json({ error: 'knownAt must be a date or time' }, { status: 400 });
  return NextResponse.json({
    asOf: asOf ? new Date(asOf).toISOString() : new Date().toISOString(),
    observations: stateAsOf({ asOf, knownAt, metric, entityId: q.get('entity') ?? undefined }),
    ...(metric ? { national: nationalTotal(metric, asOf) } : {}),
  });
}
