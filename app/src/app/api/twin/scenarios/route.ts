// Scenarios on the national twin (lib/twin/scenarios.ts): every version with
// its evidence hash and whether it still verifies. POST creates one (named
// official; audited).

import { NextRequest, NextResponse } from 'next/server';
import { listScenarios, createScenario, verifyVersion } from '@/lib/twin/scenarios';
import { syncRegister } from '@/lib/twin/register';

export const dynamic = 'force-dynamic';

export async function GET() {
  await syncRegister();
  return NextResponse.json({
    scenarios: listScenarios().map(s => ({ ...s, versions: s.versions.map(v => ({ ...v, evidenceOk: verifyVersion(s.id, v) })) })),
  });
}

export async function POST(req: NextRequest) {
  await syncRegister();
  const b = await req.json().catch(() => ({}));
  const r = createScenario(b);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ scenario: r }, { status: 201 });
}
