// POST /api/law/confirm — a different official confirms a recorded version of
// a law (four-eyes, lib/law/register.ts); from then on decisions can cite it.
// Those who can sign at the law-register authority (canConfirmLaw()).
import { NextRequest, NextResponse } from 'next/server';
import { caseScope, refusal } from '@/lib/auth/official';
import { canConfirmLaw } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { confirmVersion } from '@/lib/law/register';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const refused = await refusal(s => canConfirmLaw(s, authorityFor('lawRegister')));
  if (refused) return refused;
  const b = (await req.json().catch(() => ({}))) as { instrument?: string; version?: string; by?: string };
  const who = await caseScope();
  const r = confirmVersion(String(b.instrument ?? ''), String(b.version ?? ''), who?.label ?? b.by ?? 'Unverified official', who?.id);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ version: r });
}
