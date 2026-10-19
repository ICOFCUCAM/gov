// Scenarios on the national twin (lib/twin/scenarios.ts): every version with
// its evidence hash and whether it still verifies, and the calibration log
// (projections checked against values observed later). POST creates one (named
// official; audited).

import { NextRequest, NextResponse } from 'next/server';
import { listScenarios, createScenario, verifyVersion, calibrate, calibrationLog } from '@/lib/twin/scenarios';
import { syncRegister } from '@/lib/twin/register';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function GET() {
  await syncRegister();
  calibrate();
  return NextResponse.json({
    scenarios: listScenarios().map(s => ({ ...s, versions: s.versions.map(v => ({ ...v, evidenceOk: verifyVersion(s.id, v) })), calibration: calibrationLog(s.id) })),
  });
}

export async function POST(req: NextRequest) {
  await syncRegister();
  // A signed-in official's verified name replaces any name in the request.
  const b = await withOfficial(await req.json().catch(() => ({})));
  const r = createScenario(b);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ scenario: r }, { status: 201 });
}
