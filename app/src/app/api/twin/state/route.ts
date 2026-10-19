// What the twin knew at a moment (?asOf=ISO time, default now): the latest
// value of each entity's metric recorded by then and true by then, with its
// source and run (lineage). ?knownAt= separates the two: true by asOf, as
// recorded by knownAt (e.g. knownAt=now for "true then, as known today").
// Filter with ?metric= and ?entity=.
//
// A derived metric (lib/twin/derived.ts, e.g. population.share_65_plus) is
// computed from its inputs' observed values and answered as modelled, never
// observed: each value carries kind "modelled", the formula and the inputs it
// used (lib/twin/derived-server.ts); `derived` describes the formula.

import { NextRequest, NextResponse } from 'next/server';
import { stateAsOf, nationalTotal, syncRegister } from '@/lib/twin/register';
import { derivedMetric, formulaOf } from '@/lib/twin/derived';
import { derivedState, derivedNational } from '@/lib/twin/derived-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await syncRegister();
  const q = req.nextUrl.searchParams;
  const asOf = q.get('asOf') ?? undefined;
  if (asOf && !Number.isFinite(Date.parse(asOf))) return NextResponse.json({ error: 'asOf must be a date or time' }, { status: 400 });
  const metric = q.get('metric') ?? undefined;
  const knownAt = q.get('knownAt') ?? undefined;
  if (knownAt && !Number.isFinite(Date.parse(knownAt))) return NextResponse.json({ error: 'knownAt must be a date or time' }, { status: 400 });
  const at = asOf ? new Date(asOf).toISOString() : new Date().toISOString();
  const d = metric ? derivedMetric(metric) : undefined;
  if (d) {
    return NextResponse.json({
      asOf: at,
      derived: { metric: d.id, label: d.label, unit: d.unit, formula: formulaOf(d), inputs: [d.numerator.id, d.denominator.id], kind: 'modelled' },
      observations: derivedState(d, { asOf, knownAt, entityId: q.get('entity') ?? undefined }),
      national: derivedNational(d, asOf),
    });
  }
  return NextResponse.json({
    asOf: at,
    observations: stateAsOf({ asOf, knownAt, metric, entityId: q.get('entity') ?? undefined }),
    ...(metric ? { national: nationalTotal(metric, asOf) } : {}),
  });
}
