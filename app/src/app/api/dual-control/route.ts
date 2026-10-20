// /api/dual-control — the two-official rules for decisions
// (lib/casework/dual-control-policy.ts). GET: the platform's minimum (fixed
// in code) and the country's rules. POST { extra, requireIdentityBinding,
// pendingHours, basis } records the country's rules (administrators,
// audited): further steps its law requires two officials for, whether both
// must be linked to the national identity provider, and how long a proposal
// waits. The minimum cannot be lowered here.
import { NextRequest, NextResponse } from 'next/server';
import { withOfficial } from '@/lib/auth/official';
import { dualControlPolicy, setDualControlPolicy } from '@/lib/casework/dual-control-policy';

export const dynamic = 'force-dynamic';

const MINIMUM = [
  'A tax assessment or its variation',
  'A customs duty assessment',
  'Issuing, renewing, suspending, reinstating, revoking or correcting a regulated credential or register standing',
  'Approving an authority mapping or an operational rule; confirming, reviewing or lifting an emergency suspension; approving a procedure; confirming a law; a data restore',
];

export function GET() {
  return NextResponse.json({ minimum: MINIMUM, policy: dualControlPolicy() });
}

export async function POST(req: NextRequest) {
  const b = await withOfficial((await req.json().catch(() => ({}))) as Record<string, unknown>);
  const r = setDualControlPolicy(b, String(b.by ?? 'Administrator'));
  return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ policy: r });
}
