// Registered sources of the national twin and their recent imports.
// POST registers a source (a named official; audited). A signed-in official's
// verified name replaces any name in the request (withOfficial).

import { NextRequest, NextResponse } from 'next/server';
import { listSources, listRuns, registerSource, regionCoverage, metricsKnown, syncRegister, regionEntities } from '@/lib/twin/register';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function GET() {
  await syncRegister();
  return NextResponse.json({
    sources: listSources(), runs: listRuns().slice(0, 50), regions: regionEntities().length,
    metrics: metricsKnown().map(m => ({ metric: m, coverage: regionCoverage(m) })),
  });
}

export async function POST(req: NextRequest) {
  const b = await withOfficial(await req.json().catch(() => ({})));
  const r = registerSource(b as Parameters<typeof registerSource>[0]);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ source: r });
}
