// POST /api/law/withdraw — withdraw a mistaken version of a law, with the
// reason; it is kept and marked, never cited again (lib/law/register.ts).
// Those who can sign at the law-register authority (canConfirmLaw()).
import { NextRequest, NextResponse } from 'next/server';
import { caseScope, refusal } from '@/lib/auth/official';
import { canConfirmLaw } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { withdrawVersion } from '@/lib/law/register';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const refused = await refusal(s => canConfirmLaw(s, authorityFor('lawRegister')));
  if (refused) return refused;
  const b = (await req.json().catch(() => ({}))) as { instrument?: string; version?: string; reason?: string; by?: string };
  const who = await caseScope();
  const r = withdrawVersion(String(b.instrument ?? ''), String(b.version ?? ''), String(b.reason ?? ''), who?.label ?? b.by ?? 'Unverified official');
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ version: r });
}
