// One scenario. POST adds a version (earlier versions are kept unchanged).

import { NextRequest, NextResponse } from 'next/server';
import { getScenario, reviseScenario, verifyVersion, calibrate, calibrationLog } from '@/lib/twin/scenarios';
import { syncRegister } from '@/lib/twin/register';
import { withOfficial, currentOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const s = getScenario(params.id);
  if (!s) return NextResponse.json({ error: 'No such scenario' }, { status: 404 });
  calibrate();
  return NextResponse.json({ scenario: { ...s, versions: s.versions.map(v => ({ ...v, evidenceOk: verifyVersion(s.id, v) })), calibration: calibrationLog(s.id) } });
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await syncRegister();
  // Who acted is the verified official when one is signed in, never a name from the body
  // (CLAUDE.md "Who acted"); with sign-in enforced, nobody else may record a scenario.
  if (process.env.CIVICOS_AUTH === 'enforce' && !(await currentOfficial())) {
    return NextResponse.json({ error: 'Sign in as an official to record a scenario (/sign-in)' }, { status: 401 });
  }
  const b = await withOfficial(await req.json().catch(() => ({})));
  const r = reviseScenario(params.id, b);
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'No such scenario' ? 404 : 422 });
  return NextResponse.json({ scenario: r });
}
