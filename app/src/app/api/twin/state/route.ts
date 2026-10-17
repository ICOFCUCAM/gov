// What the twin knew at a moment (?asOf=ISO time, default now): the latest
// value of each entity's metric recorded by then and true by then, with its
// source and run (lineage). Filter with ?metric= and ?entity=.

import { NextRequest, NextResponse } from 'next/server';
import { stateAsOf, nationalTotal, syncRegister } from '@/lib/twin/register';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await syncRegister();
  const q = req.nextUrl.searchParams;
  const asOf = q.get('asOf') ?? undefined;
  if (asOf && !Number.isFinite(Date.parse(asOf))) return NextResponse.json({ error: 'asOf must be a date or time' }, { status: 400 });
  const metric = q.get('metric') ?? undefined;
  return NextResponse.json({
    asOf: asOf ? new Date(asOf).toISOString() : new Date().toISOString(),
    observations: stateAsOf({ asOf, metric, entityId: q.get('entity') ?? undefined }),
    ...(metric ? { national: nationalTotal(metric, asOf) } : {}),
  });
}
