// Registered sources of the national twin and their recent imports, and the
// size of the history archive (older observations and runs, still queried).
// POST registers a source (a named official; audited). A signed-in official's
// verified name replaces any name in the request (withOfficial). A stream
// source that receives pushed readings (`stream.ingest`: an integration for
// SensorThings, the nation's MQTT broker) needs an administrator or an
// official who can sign (canConnectStream), as /api/twin/sources/[id]/ingest.

import { NextRequest, NextResponse } from 'next/server';
import { listSources, listRuns, registerSource, regionCoverage, metricsKnown, syncRegister, regionEntities } from '@/lib/twin/register';
import { withOfficial, refusal } from '@/lib/auth/official';
import { canConnectStream } from '@/lib/auth/roles';
import { syncStreamSubscribers } from '@/lib/twin/mqtt';
import { archiveStatus } from '@/lib/twin/archive';
import { twinPolicy } from '@/lib/twin/policy';

export const dynamic = 'force-dynamic';

export async function GET() {
  await syncRegister();
  return NextResponse.json({
    sources: listSources(), runs: listRuns().slice(0, 50), regions: regionEntities().length,
    metrics: metricsKnown().map(m => ({ metric: m, coverage: regionCoverage(m) })),
    archive: archiveStatus(),
    // Whether withdrawing an import needs a second official (the screen says so).
    policy: twinPolicy(),
  });
}

export async function POST(req: NextRequest) {
  const b = await withOfficial(await req.json().catch(() => ({})));
  const input = b as Parameters<typeof registerSource>[0];
  const connects = !!input.stream?.ingest;
  if (connects) { const refused = await refusal(canConnectStream); if (refused) return refused; }
  const r = registerSource(input);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  if (connects) await syncStreamSubscribers();
  return NextResponse.json({ source: r });
}
