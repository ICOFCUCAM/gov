// One scenario. POST adds a version (earlier versions are kept unchanged).

import { NextRequest, NextResponse } from 'next/server';
import { getScenario, reviseScenario, verifyVersion } from '@/lib/twin/scenarios';
import { syncRegister } from '@/lib/twin/register';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const s = getScenario(params.id);
  if (!s) return NextResponse.json({ error: 'No such scenario' }, { status: 404 });
  return NextResponse.json({ scenario: { ...s, versions: s.versions.map(v => ({ ...v, evidenceOk: verifyVersion(s.id, v) })) } });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await syncRegister();
  // A signed-in official's verified name replaces any name in the request.
  const b = await withOfficial(await req.json().catch(() => ({})));
  const r = reviseScenario(params.id, b);
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'No such scenario' ? 404 : 422 });
  return NextResponse.json({ scenario: r });
}
