// The nation's rules for its twin (lib/twin/policy.ts): whether withdrawing
// an import needs a second official to confirm it (four-eyes, on by
// default), and whether a stream's MQTT broker may be on the nation's own
// private network (privateBrokers, off by default). GET reads it; POST
// { fourEyesWithdrawal?: boolean, privateBrokers?: boolean } changes it,
// administrators only (ADMIN_ONLY in lib/auth/roles.ts), named and audited.
// A signed-in official's verified name replaces any name in the request
// (withOfficial).

import { NextRequest, NextResponse } from 'next/server';
import { twinPolicy, setTwinPolicy } from '@/lib/twin/policy';
import { withOfficial, refusal } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ policy: twinPolicy() });
}

export async function POST(req: NextRequest) {
  const refused = await refusal(adminOnly);
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string; fourEyesWithdrawal?: boolean; privateBrokers?: boolean };
  const r = setTwinPolicy({ fourEyesWithdrawal: b.fourEyesWithdrawal, privateBrokers: b.privateBrokers }, String(b.by ?? ''));
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ policy: r });
}
